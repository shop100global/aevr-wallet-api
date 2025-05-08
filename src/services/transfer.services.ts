// ./src/services/transfer.services.ts

import {
  Pay100,
  ITransferAssetData,
  ITransferHistoryParams,
  ITransferFeeParams,
} from "@100pay-hq/100pay.js";
import { Types } from "mongoose";
import UserWallet from "../models/userWallet.model.js";
import { WalletService } from "./userWallet.services.js";
import { UserWalletDocument } from "../types/userWallet/index.js";
import { logger } from "@untools/logger";

/**
 * Service for handling cryptocurrency transfers using the 100Pay SDK
 */
export class TransferService {
  private client: Pay100;
  private walletService: WalletService;

  /**
   * Initialize the transfer service with API credentials
   *
   * @param publicKey - 100Pay API public key
   * @param secretKey - 100Pay API secret key
   * @param baseUrl - Optional API base URL
   */
  constructor(publicKey: string, secretKey: string, baseUrl?: string) {
    this.client = new Pay100({
      publicKey,
      secretKey,
      baseUrl,
    });

    this.walletService = new WalletService(publicKey, secretKey, baseUrl);
  }

  /**
   * Transfer assets between wallets
   *
   * @param fromUserId - MongoDB ObjectId of the sender
   * @param toUserId - MongoDB ObjectId of the recipient
   * @param amount - Amount to transfer
   * @param symbol - Cryptocurrency symbol (e.g., "BTC", "ETH")
   * @param description - Optional transfer description
   * @returns Transfer result with transaction details
   */
  async transferAssets({
    fromUserId,
    toUserId,
    toAddress,
    amount,
    symbol,
    network,
    description = "Asset transfer",
  }: {
    fromUserId: string | Types.ObjectId;
    toUserId?: string | Types.ObjectId;
    toAddress?: string;
    amount: number;
    network: string;
    symbol: string;
    description?: string;
  }) {
    try {
      // Get sender wallet
      const fromWallet = await this.walletService.getUserWalletBySymbol(
        fromUserId,
        symbol,
        network
      );

      if (!fromWallet) {
        throw new Error(
          `Sender doesn't have a ${symbol} wallet with network ${network}`
        );
      }

      let walletAddress: string;
      let toWallet: UserWalletDocument;
      // Determine recipient wallet address
      if (toAddress && toUserId) {
        // If both toAddress and toUserId are provided, use toAddress
        walletAddress = toAddress;
      } else if (toAddress && !toUserId) {
        // If only toAddress is provided, use it directly
        walletAddress = toAddress;
      } else if (!toAddress && toUserId) {
        // If only toUserId is provided, use the wallet for that user
        toWallet = await this.walletService.getUserWalletBySymbol(
          toUserId,
          symbol
        );

        if (!toWallet) {
          throw new Error(`Recipient doesn't have a ${symbol} wallet`);
        }

        walletAddress = toWallet.account.address;
      }

      // Check if the wallet address is valid
      if (!walletAddress) {
        throw new Error("No valid wallet address provided");
      }
      // // Validate the wallet address format
      // if (!this.client.utils.isValidAddress(walletAddress, symbol)) {
      //   throw new Error("Invalid wallet address format");
      // }

      // Prepare transfer payload
      const transferData: ITransferAssetData = {
        amount: amount.toString(),
        symbol: symbol.toUpperCase(),
        to: walletAddress,
        description,
        from: fromWallet.account.address,
        // Add authentication if required by the SDK
        // authType: "PIN",
        // authValue: "1234", // In production, this should be securely provided by the user
      };

      // Execute transfer through 100Pay SDK
      const transferResult =
        await this.client.transfer.executeTransfer(transferData);

      logger.info("transferResult", transferResult);

      return {
        ...transferResult,
        fromWallet,
        toWallet: toAddress
          ? { account: { address: toAddress } }
          : await this.walletService.getUserWalletBySymbol(toUserId, symbol),
        fromUserId,
      };
    } catch (error) {
      console.error("Transfer failed:", error);
      throw new Error(
        `Failed to transfer assets: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get transfer history for a user
   *
   * @param userId - MongoDB ObjectId of the user
   * @param params - Optional filters and pagination options
   * @returns Paginated transfer history
   */
  async getTransferHistory(
    userId: string | Types.ObjectId,
    params: Partial<ITransferHistoryParams> = {}
  ) {
    try {
      // Get all wallets for the user
      const userWallets = await this.walletService.getFilteredUserWallets({
        filters: {
          userId: userId.toString(),
          ...(params.symbols && { symbols: params.symbols }),
          ...(params.accountIds && { sourceAccountIds: params.accountIds }),
        },
      });

      // Extract wallet addresses
      const walletAddresses = userWallets.data.map(
        (wallet) => wallet.account.address
      );

      // Extract wallet ids
      const walletSourceAccountIds = userWallets.data.map(
        (wallet) => wallet.sourceAccountId
      );

      // Prepare history params
      const historyParams: ITransferHistoryParams = {
        page: params.page || 1,
        limit: params.limit || 10,
        addresses: walletAddresses,
        accountIds: walletSourceAccountIds,
        ...params,
      };

      // Get transfer history from 100Pay API
      const historyResult =
        await this.client.transfer.getHistory(historyParams);

      logger.debug("Transfer history result", historyResult);

      return {
        ...historyResult,
        data: historyResult.data.map((trx) => ({
          ...trx,
          id: trx._id.toString(),
        })),
      };
    } catch (error) {
      console.error("Failed to get transfer history:", error);
      throw new Error(
        `Failed to get transfer history: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Calculate transfer fees for a transaction
   *
   * @param userId - MongoDB ObjectId of the user
   * @param symbol - Cryptocurrency symbol
   * @param amount - Transfer amount
   * @param network - Network name
   * @returns Fee calculation result
   */
  async calculateTransferFee({
    userId,
    symbol,
    network,
    amount,
  }: {
    userId: string | Types.ObjectId;
    symbol: string;
    network: string;
    amount: number;
  }) {
    try {
      // Get user wallet for the symbol
      const userWallet = await this.walletService.getUserWalletBySymbol(
        userId,
        symbol,
        network
      );

      if (!userWallet) {
        throw new Error(`User doesn't have a ${symbol} wallet`);
      }

      // Prepare fee calculation params
      const feeParams: ITransferFeeParams = {
        symbol: symbol.toUpperCase(),
        amount: amount.toString(),
        address: userWallet.account.address,
      };

      // Calculate fee through 100Pay API
      const feeResult = await this.client.transfer.calculateFee(feeParams);

      return {
        ...feeResult,
        wallet: userWallet,
      };
    } catch (error) {
      console.error("Fee calculation failed:", error);
      throw new Error(
        `Failed to calculate transfer fee: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
