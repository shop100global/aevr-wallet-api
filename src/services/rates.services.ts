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

import { logger } from "@untools/logger";
import {
  CryptoPrice,
  FiatPrice,
  SimpleConversionResult,
  UpdatePriceResponse,
  UpdateSpecificCoinResponse,
} from "../types/rates.js";

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
        "x-api-key": `${this.apiKey}`,
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
    const options = this.createRequestOptions("GET");

    const response = await fetch(`${this.baseUrl}/api/fiat-prices`, options);
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
    const options = this.createRequestOptions("GET");

    const response = await fetch(url.toString(), options);
    return this.handleResponse<FiatPrice>(response);
  }

  /**
   * Converts an amount from one currency to another using provided exchange rates.
   * No fees or extra logic applied.
   *
   * @param fromSymbol Source currency (e.g., "BTC", "NGN")
   * @param toSymbol Target currency (e.g., "USD")
   * @param amount Amount to convert in the source currency
   * @param rates Array of available exchange rates
   * @returns Conversion result with rates and converted amount
   * @throws Error if either rate is missing
   */
  async convertCurrency({
    fromSymbol,
    toSymbol,
    amount,
  }: {
    fromSymbol: string;
    toSymbol: string;
    amount: number;
  }): Promise<SimpleConversionResult> {
    logger.info("RatesService.convertCurrency", {
      fromSymbol,
      toSymbol,
      amount,
    });

    const rates = await this.getAllPrices();

    const fromRate = rates.find(
      (rate) => rate.symbol.toLowerCase() === fromSymbol.toLowerCase().trim()
    )?.price;
    const toRate = rates.find(
      (rate) => rate.symbol.toLowerCase() === toSymbol.toLowerCase().trim()
    )?.price;

    if (!fromRate || !toRate) {
      throw new Error(
        `Exchange rate not found for ${fromSymbol} or ${toSymbol}`
      );
    }

    const intermediateUSDAmount = amount * fromRate;
    const convertedAmount = intermediateUSDAmount / toRate;

    return {
      convertedAmount,
      fromRate,
      toRate,
      intermediateUSDAmount,
    };
  }
}
