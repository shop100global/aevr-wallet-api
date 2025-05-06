import { logger } from "@untools/logger";
import { RatesService } from "../../services/rates.services.js";

const ratesService = new RatesService();

const ratesResolvers = {
  Query: {
    getAllPrices: async (parent, args, context, info) => {
      try {
        const rates = await ratesService.getAllPrices();
        return rates;
      } catch (error) {
        console.log("Query.getAllPrices error", error);
        throw error;
      }
    },
    getPrice: async (parent, args, context, info) => {
      try {
        const rate = await ratesService.getPrice(args.symbol, args.currency);
        return rate;
      } catch (error) {
        console.log("Query.getPrice error", error);
        throw error;
      }
    },
    triggerPriceUpdate: async (parent, args, context, info) => {
      try {
        const updatePriceResponse = await ratesService.triggerPriceUpdate();
        return updatePriceResponse;
      } catch (error) {
        console.log("Query.triggerPriceUpdate error", error);
        throw error;
      }
    },
    updateCoinPrice: async (parent, args, context, info) => {
      try {
        const updateSpecificCoinResponse = await ratesService.updateCoinPrice(
          args.coin
        );
        return updateSpecificCoinResponse;
      } catch (error) {
        console.log("Query.updateCoinPrice error", error);
        throw error;
      }
    },
    getAllFiatPrices: async (parent, args, context, info) => {
      try {
        const fiatPrices = await ratesService.getAllFiatPrices();
        return fiatPrices;
      } catch (error) {
        console.log("Query.getAllFiatPrices error", error);
        throw error;
      }
    },
    getFiatPrice: async (parent, args, context, info) => {
      try {
        const fiatPrice = await ratesService.getFiatPrice(
          args.symbol,
          args.currency
        );
        return fiatPrice;
      } catch (error) {
        console.log("Query.getFiatPrice error", error);
        throw error;
      }
    },
    convertCurrency: async (parent, args, context, info) => {
      logger.info("Query.convertCurrency", args);
      try {
        const convertedAmount = await ratesService.convertCurrency({
          fromSymbol: args.fromSymbol,
          toSymbol: args.toSymbol,
          amount: args.amount,
        });
        return convertedAmount;
      } catch (error) {
        console.log("Query.convertCurrency error", error);
        throw error;
      }
    },
  },
};

export default ratesResolvers;
