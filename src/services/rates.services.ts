/**
 * RatesService
 *
 * A TypeScript service class for interacting with the Cryptocurrency Price API.
 * This service provides methods to retrieve cryptocurrency prices, update margins,
 * trigger manual price updates, and handle fiat currency conversions.
 *
 * Authentication is handled via API key, which should be passed to all requests.
 *
 * @version 1.0.0
 */

// Define TypeScript interfaces for the API responses
interface CryptoPrice {
  symbol: string;
  price: number;
  margin: number;
  updated_price: number;
  last_updated: string;
  currency?: string;
}

interface MarginUpdateResponse {
  message: string;
  updated_price: number;
  margin: number;
}

interface UpdatePriceResponse {
  message: string;
}

interface UpdateSpecificCoinResponse {
  message: string;
  price: CryptoPrice;
}

interface FiatPrice {
  symbol: string;
  rate_to_usd: number;
  last_updated: string;
}

interface MarginUpdateRequest {
  margin: number;
}

const RATES_API_URL = process.env.RATES_API || "";
const API_KEY = process.env.RATES_API_KEY || "";

/**
 * RatesService class for interacting with the cryptocurrency price API
 */
export class RatesService {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  /**
   * Create a new instance of RatesService
   *
   * @param baseUrl - The base URL of the API
   * @param apiKey - The API key required for authentication
   */
  constructor(baseUrl: string = RATES_API_URL, apiKey: string = API_KEY) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;

    if (!apiKey) {
      throw new Error("API key is required for RatesService");
    }
  }

  /**
   * Helper method to handle API errors
   *
   * @param response - The fetch response object
   * @returns The JSON response if successful
   * @throws Error with appropriate message if the request fails
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      // Try to parse error response as JSON
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData
        ? JSON.stringify(errorData)
        : `HTTP error ${response.status}`;

      // Handle specific error codes
      if (response.status === 401) {
        throw new Error("API Error: Unauthorized. Please check your API key.");
      } else if (response.status === 403) {
        throw new Error(
          "API Error: Forbidden. Your API key might not have sufficient permissions."
        );
      } else {
        throw new Error(`API Error: ${errorMessage}`);
      }
    }

    return (await response.json()) as T;
  }

  /**
   * Helper method to create request options with proper authentication headers
   *
   * @param method - The HTTP method to use (default: 'GET')
   * @param body - Optional request body for POST/PUT requests
   * @returns Request options object with headers
   */
  private createRequestOptions(
    method: string = "GET",
    body?: any
  ): RequestInit {
    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    return options;
  }

  /**
   * Get all cryptocurrency prices
   *
   * @returns Promise resolving to an array of cryptocurrency prices
   * @throws Error if the API request fails
   */
  async getAllPrices(): Promise<CryptoPrice[]> {
    const options = this.createRequestOptions("GET");
    const response = await fetch(`${this.baseUrl}/api/prices`, options);
    return this.handleResponse<CryptoPrice[]>(response);
  }

  /**
   * Get price for a specific cryptocurrency symbol
   *
   * @param symbol - The symbol of the cryptocurrency (e.g., 'BTC')
   * @param currency - Optional fiat currency to convert the price to (default: 'USD')
   * @returns Promise resolving to the cryptocurrency price information
   * @throws Error if the API request fails or the symbol is not found
   */
  async getPrice(symbol: string, currency?: string): Promise<CryptoPrice> {
    const url = new URL(`${this.baseUrl}/api/price/${symbol}`);

    if (currency) {
      url.searchParams.append("currency", currency);
    }

    const options = this.createRequestOptions("GET");
    const response = await fetch(url.toString(), options);
    return this.handleResponse<CryptoPrice>(response);
  }

  /**
   * Update the margin for a specific cryptocurrency symbol
   *
   * @param symbol - The symbol of the cryptocurrency (e.g., 'BTC')
   * @param margin - The new margin value to set
   * @returns Promise resolving to the margin update response
   * @throws Error if the API request fails or the symbol is not found
   */
  async updateMargin(
    symbol: string,
    margin: number
  ): Promise<MarginUpdateResponse> {
    const options = this.createRequestOptions("PUT", {
      margin,
    } as MarginUpdateRequest);
    const response = await fetch(
      `${this.baseUrl}/api/update-margin/${symbol}`,
      options
    );

    return this.handleResponse<MarginUpdateResponse>(response);
  }

  /**
   * Trigger a manual update of all cryptocurrency prices
   *
   * @returns Promise resolving to the update response
   * @throws Error if the API request fails
   */
  async triggerPriceUpdate(): Promise<UpdatePriceResponse> {
    const options = this.createRequestOptions("POST");
    const response = await fetch(`${this.baseUrl}/api/update-prices`, options);

    return this.handleResponse<UpdatePriceResponse>(response);
  }

  /**
   * Trigger a manual update for a specific cryptocurrency
   *
   * @param coin - The symbol of the cryptocurrency to update (e.g., 'BTC')
   * @returns Promise resolving to the update response including the updated price
   */
  async updateCoinPrice(coin: string): Promise<UpdateSpecificCoinResponse> {
    const response = await fetch(`${this.baseUrl}/api/update-price/${coin}`, {
      method: "POST",
    });

    return this.handleResponse<UpdateSpecificCoinResponse>(response);
  }

  /**
   * Get all fiat currency prices in USD
   *
   * @returns Promise resolving to an array of fiat currency prices
   */
  async getAllFiatPrices(): Promise<FiatPrice[]> {
    const response = await fetch(`${this.baseUrl}/api/fiat-prices`);
    return this.handleResponse<FiatPrice[]>(response);
  }

  /**
   * Get the price of a specified fiat currency in another currency
   *
   * @param symbol - The symbol of the fiat currency (e.g., 'EUR')
   * @param targetCurrency - Optional target currency for conversion (default: 'USD')
   * @returns Promise resolving to the fiat currency price information
   */
  async getFiatPrice(
    symbol: string,
    targetCurrency?: string
  ): Promise<FiatPrice> {
    const url = new URL(`${this.baseUrl}/api/fiat-price/${symbol}`);

    if (targetCurrency) {
      url.searchParams.append("currency", targetCurrency);
    }

    const response = await fetch(url.toString());
    return this.handleResponse<FiatPrice>(response);
  }

  /**
   * Helper method to calculate the equivalent price in a different fiat currency
   *
   * @param amount - The amount to convert
   * @param fromCurrency - The source currency (e.g., 'USD')
   * @param toCurrency - The target currency (e.g., 'EUR')
   * @returns Promise resolving to the converted amount
   */
  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    // Get rates for both currencies in USD
    const fromRate = await this.getFiatPrice(fromCurrency);
    const toRate = await this.getFiatPrice(toCurrency);

    // Calculate the conversion
    // First convert to USD, then to target currency
    const amountInUsd = amount / fromRate.rate_to_usd;
    const amountInTargetCurrency = amountInUsd * toRate.rate_to_usd;

    return amountInTargetCurrency;
  }
}
