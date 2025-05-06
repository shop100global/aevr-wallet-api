const ratesTypeDefs = `#graphql
  type CryptoPrice {
    symbol: String
    price: Float
    margin: Float
    updated_price: Float
    last_updated: String
    currency: String
  }

  type FiatPrice {
    symbol: String
    rate_to_usd: Float
    last_updated: String
  }

  type UpdatePriceResponse {
    message: String
  }

  type UpdateSpecificCoinResponse {
    message: String
    price: CryptoPrice
  }

  type SimpleConversionResult {
    convertedAmount: Float
    fromRate: Float
    toRate: Float
    intermediateUSDAmount: Float
  }

  type Query {
    getAllPrices: [CryptoPrice]
    getPrice(symbol: String, currency: String): CryptoPrice
    triggerPriceUpdate: UpdatePriceResponse
    updateCoinPrice(coin: String): UpdateSpecificCoinResponse
    getAllFiatPrices: [FiatPrice]
    getFiatPrice(symbol: String, currency: String): FiatPrice
    convertCurrency(amount: Float, fromSymbol: String, toSymbol: String): SimpleConversionResult
  }
`;

export default ratesTypeDefs;
