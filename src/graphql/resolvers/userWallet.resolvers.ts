// ./src/graphql/resolvers/userWallet.resolvers.ts

import User from "../../models/user.model.js";
import { WalletService } from "../../services/userWallet.services.js";
import { Filters } from "../../utils/filters/index.js";
import { PaginationInput } from "./index.js";

interface WalletQueryArgs {
  filter?: Filters.UserWalletFilterOptions;
  pagination?: PaginationInput;
}

interface UserWalletBySymbolArgs {
  userId: string;
  symbol: string;
}

// Initialize the wallet service with your 100Pay API keys
const walletService = new WalletService(
  process.env.PAY100_PUBLIC_KEY || "",
  process.env.PAY100_SECRET_KEY || "",
  "http://localhost:3001"
);

export const userWalletResolvers = {
  UserWallet: {
    /**
     * Get the balance of a wallet
     */
    balance: async (parent, args, context, info) => {
      try {
        const balance = await walletService.getWalletBalanceByAccountId(
          parent.accountId,
          parent.symbol
        );
        return balance;
      } catch (error) {
        console.log("Query.balance error", error);
        throw error;
      }
    },
  },
  Query: {
    /**
     * Get wallets for users with filtering and pagination
     */
    getUserWallets: async (parent, args, context, info) => {
      try {
        const userId = context?.user?.data?.id;
        if (!userId) throw new Error("User not found");

        const filter = args.filter || {};
        const pagination = args.pagination || {};

        const wallets = await walletService.getFilteredUserWallets({
          filter: { ...filter, userId },
          pagination,
        });

        return wallets;
      } catch (error) {
        console.log("Query.getUserWallets error", error);
        throw error;
      }
    },
    /**
     * Get a wallet by symbol for a user
     */
    getUserWalletBySymbol: async (parent, args, context, info) => {
      try {
        const userId = context?.user?.data?.id;
        if (!userId) throw new Error("User not found");
        const symbol = args.symbol;
        const wallet = await walletService.getUserWalletBySymbol(
          userId,
          symbol
        );

        return wallet;
      } catch (error) {
        console.log("Query.getUserWalletBySymbol error", error);
        throw error;
      }
    },
    /**
     * Get supported cryptocurrencies
     */
    getSupportedCryptocurrencies: async (parent, args, context, info) => {
      try {
        const supportedWallets =
          await walletService.getSupportedCryptocurrencies();
        return supportedWallets;
      } catch (error) {
        console.log("Query.getSupportedCryptocurrencies error", error);
        throw error;
      }
    },
  },
  Mutation: {
    /**
     * Create wallets for users
     */
    createUserWallets: async (parent, args, context, info) => {
      try {
        const userId = context?.user?.data?.id;
        const user = await User.findById(userId);
        const { symbols, networks, metadata } = args.input;

        const wallets = await walletService.createUserWallets({
          userId,
          email: user.email,
          name: user.firstName + " " + user.lastName,
          phone: "000000000",
          symbols,
          networks,
          metadata: { ...metadata, userId },
        });

        return wallets;
      } catch (error) {
        console.log("Mutation.createUserWallets error", error);
        throw error;
      }
    },
  },
};
