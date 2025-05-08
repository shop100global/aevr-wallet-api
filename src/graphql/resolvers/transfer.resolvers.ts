// ./src/graphql/resolvers/transfer.resolvers.ts

import { TransferService } from "../../services/transfer.services.js";
import { WalletService } from "../../services/userWallet.services.js";

interface TransferAssetsInput {
  toAddress?: string;
  toUserId?: string;
  network: string;
  amount: number;
  symbol: string;
  description?: string;
}

interface TransferHistoryArgs {
  pagination: { page?: number; limit?: number };
  symbols?: string[];
}

interface TransferFeeArgs {
  symbol: string;
  amount: number;
  network: string;
}

// Initialize the transfer service with your 100Pay API keys
const transferService = new TransferService(
  process.env.PAY100_PUBLIC_KEY || "",
  process.env.PAY100_SECRET_KEY || ""
);

// Initialize a new wallet service
const walletService = new WalletService(
  process.env.PAY100_PUBLIC_KEY || "",
  process.env.PAY100_SECRET_KEY || ""
);

export const transferResolvers = {
  TransferHistoryItem: {
    wallet: async (parent, args, context, info) => {
      try {
        const wallet = await walletService.getUserWalletByAccountId(
          parent.accountId
        );
        return wallet;
      } catch (error) {
        console.log("Query.wallet error", error);
        throw error;
      }
    },
  },
  Query: {
    /**
     * Get transfer history for the authenticated user
     */
    getTransferHistory: async (
      parent,
      args: TransferHistoryArgs,
      context,
      info
    ) => {
      try {
        const userId = context?.user?.data?.id;
        if (!userId) throw new Error("User not found");

        const pagination = args.pagination || {};
        const symbols = args.symbols || [];

        const history = await transferService.getTransferHistory(userId, {
          page: pagination?.page || 1,
          limit: pagination?.limit || 10,
          symbols,
        });

        return { data: history.data, meta: history.meta };
      } catch (error) {
        console.log("Query.getTransferHistory error", error);
        throw error;
      }
    },

    /**
     * Calculate transfer fee for a transaction
     */
    calculateTransferFee: async (parent, args, context, info) => {
      try {
        const userId = context?.user?.data?.id;
        if (!userId) throw new Error("User not found");

        const input: TransferFeeArgs = args?.input || {};

        const feeResult = await transferService.calculateTransferFee({
          amount: input.amount,
          symbol: input.symbol,
          network: input.network,
          userId,
        });

        return feeResult;
      } catch (error) {
        console.log("Query.calculateTransferFee error", error);
        throw error;
      }
    },
  },
  Mutation: {
    /**
     * Transfer assets to another user
     */
    transferAssets: async (
      parent,
      { input }: { input: TransferAssetsInput },
      context,
      info
    ) => {
      try {
        const userId = context?.user?.data?.id;
        if (!userId) throw new Error("User not found");

        const { toAddress, toUserId, amount, network, symbol, description } =
          input;

        const transferResult = await transferService.transferAssets({
          fromUserId: userId,
          toAddress,
          toUserId,
          amount,
          symbol,
          network,
          description,
        });

        return transferResult.data;
      } catch (error) {
        console.log("Mutation.transferAssets error", error);
        throw error;
      }
    },
  },
};
