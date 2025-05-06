// ./src/graphql/resolvers/userWallet.resolvers.ts

import { logger } from "@untools/logger";
import User from "../../models/user.model.js";
import { WalletService } from "../../services/userWallet.services.js";
import { Filters } from "../../utils/filters/index.js";
import { PaginationInput } from "./index.js";
import { RatesService } from "../../services/rates.services.js";
import { checkUserIsAdmin } from "../../utils/user.js";

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
  process.env.PAY100_SECRET_KEY || ""
);

const ratesService = new RatesService();

export const userWalletResolvers = {
  UserWallet: {
    /**
     * Get the balance of a wallet
     */
    balance: async (parent, args, context, info) => {
      try {
        const balance = await walletService.getWalletBalanceByAccountId(
          parent.sourceAccountId,
          parent.symbol
        );
        const balanceInUsd = await ratesService.convertCurrency({
          fromSymbol: parent.symbol,
          toSymbol: "USD",
          amount: balance.availableBalance,
        });
        return {
          ...balance,
          availableBalanceInUsd: balanceInUsd.convertedAmount,
        };
      } catch (error) {
        console.log("Query.balance error", error);
        return {
          totalBalance: 0,
          availableBalance: 0,
          pendingCredits: 0,
          pendingDebits: 0,
          availableBalanceInUsd: 0,
          transactions: [],
        };
      }
    },
  },
  SupportedWallet: {
    /**
     * Get the balance of a wallet
     */
    balance: async (parent, args, context, info) => {
      try {
        const accountAddresses = parent.accounts.map(
          (account: { address: string }) => account.address
        );

        if (accountAddresses.length === 0) {
          return {
            totalBalance: 0,
            availableBalance: 0,
            pendingCredits: 0,
            pendingDebits: 0,
            transactions: [],
          };
        }

        const balance = await walletService.getWalletBalanceByAccountAddress(
          accountAddresses,
          parent.symbol
        );
        return balance;
      } catch (error) {
        console.log("Query.balance error", error);
        return {
          totalBalance: 0,
          availableBalance: 0,
          pendingCredits: 0,
          pendingDebits: 0,
          transactions: [],
        };
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

        const userIsAdmin = await checkUserIsAdmin(userId);

        const wallets = await walletService.getFilteredUserWallets({
          filter: { ...filter, userId: userIsAdmin ? filter.userId : userId },
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
     * Get supported wallets
     */
    getSupportedWallets: async (parent, args, context, info) => {
      try {
        const filter = args.filter;
        const pagination = args.pagination;

        const wallets = await walletService.getSupportedWallets({
          filter,
          pagination,
        });

        return wallets;
      } catch (error) {
        console.log("Query.getSupportedWallets error", error);
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
