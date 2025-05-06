// Define TypeScript interfaces for the API responses
export interface CryptoPrice {
  symbol: string;
  price: number;
  margin: number;
  updated_price: number;
  last_updated: string;
  currency?: string;
}

export interface UpdatePriceResponse {
  message: string;
}

export interface UpdateSpecificCoinResponse {
  message: string;
  price: CryptoPrice;
}

export interface FiatPrice {
  symbol: string;
  rate_to_usd: number;
  last_updated: string;
}

export interface SimpleConversionResult {
  convertedAmount: number;
  fromRate: number;
  toRate: number;
  intermediateUSDAmount: number;
}
