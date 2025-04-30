// ./src/services/userWallet.services.ts

// src/services/walletService.ts
import { Pay100, CreateSubAccountData, Account } from "@100pay-hq/100pay.js";
import { Types } from "mongoose";
import {
  BalanceResult,
  UserWalletDocument,
} from "../types/userWallet/index.js";
import UserWallet from "../models/userWallet.model.js";
import { Filters, UserWalletFilters } from "../utils/filters/index.js";
import paginateCollection, { Pagination } from "../utils/paginate.js";
import { logger } from "@untools/logger";
import { WalletBalanceUtil } from "../utils/userWallet/balance.js";

export class WalletService {
  private client: Pay100;
  private utils: WalletBalanceUtil;

  constructor(publicKey: string, secretKey: string, baseUrl?: string) {
    this.client = new Pay100({
      publicKey,
      secretKey,
      baseUrl,
    });
    this.utils = new WalletBalanceUtil(this.client);
  }

  /**
   * Creates cryptocurrency wallets for a user using 100Pay subaccounts
   *
   * @param userId - MongoDB ObjectId of the user
   * @param email - User's email address
   * @param name - User's full name
   * @param phone - User's phone number
   * @param symbols - Array of crypto symbols to create wallets for (e.g., ["BTC", "ETH", "USDT"])
   * @param networks - Array of blockchain networks to support (e.g., ["ETHEREUM", "BSC"])
   * @param metadata - Additional metadata to store with the subaccount
   * @returns Array of created wallet documents
   */
  async createUserWallets({
    userId,
    email,
    name,
    phone,
    symbols = ["BTC", "ETH", "USDT", "PAY"],
    networks = ["BSC"],
    metadata = {},
  }: {
    userId: string | Types.ObjectId;
    email: string;
    name: string;
    phone: string;
    symbols?: string[];
    networks?: string[];
    metadata?: Record<string, unknown>;
  }): Promise<UserWalletDocument[]> {
    try {
      // Prepare the subaccount creation payload
      const subaccountData: CreateSubAccountData = {
        symbols,
        networks,
        owner: {
          name,
          email,
          phone,
        },
        metadata: {
          ...metadata,
          userId: userId.toString(),
        },
      };

      // Create subaccount via 100Pay API
      const response = await this.client.subaccounts.create(subaccountData);

      // Save each account (wallet) to our database
      const savedWallets = await Promise.all(
        response.accounts.map((account) => this.saveWalletToDb(userId, account))
      );

      return savedWallets;
    } catch (error) {
      console.error("Failed to create wallets:", error);
      throw new Error(
        `Failed to create user wallets: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Saves a wallet account from 100Pay to our database
   *
   * @param userId - User's MongoDB ObjectId
   * @param account - Account data from 100Pay
   * @returns Saved wallet document
   */
  private async saveWalletToDb(
    userId: string | Types.ObjectId,
    account: Account
  ): Promise<UserWalletDocument> {
    const walletData = {
      user: new Types.ObjectId(userId),
      accountType: account.accountType,
      walletType: account.walletType,
      status: account.status,
      name: account.name,
      symbol: account.symbol,
      decimals: account.decimals,
      account: {
        address: account.account.address,
        key: account.account.key,
        network: account.account.network,
      },
      contractAddress: account.contractAddress,
      logo: account.logo,
      userId: account.userId,
      appId: account.appId,
      network: account.network,
      ownerId: account.ownerId,
      parentWallet: account.parentWallet,
      sourceAccountId: account._id, // Store the original 100Pay account ID
    };

    const wallet = new UserWallet(walletData);
    return (await wallet.save()).populate("user");
  }

  /**
   * Gets all wallets for a specific user
   *
   * @param userId - User's MongoDB ObjectId
   * @returns Array of user wallet documents
   */
  async getUserWallets(
    userId: string | Types.ObjectId
  ): Promise<UserWalletDocument[]> {
    return UserWallet.find({ user: new Types.ObjectId(userId) }).populate(
      "user"
    );
  }

  /**
   * Gets wallets with filtering and pagination options
   *
   * @param filters - Filter options for wallets
   * @param page - Page number for pagination
   * @param limit - Number of records per page
   * @returns Paginated wallet data
   */
  async getFilteredUserWallets({
    filter = {},
    pagination = { page: 1, limit: 10 },
  }: {
    filter?: Filters.UserWalletFilterOptions;
    pagination?: Pagination;
  }) {
    const constructedFilters = UserWalletFilters({ filters: filter });
    return paginateCollection(
      UserWallet,
      {
        page: pagination.page,
        limit: pagination.limit,
      },
      {
        filter: constructedFilters,
        populate: "user",
      }
    );
  }

  /**
   * Gets a specific wallet by symbol for a user
   *
   * @param userId - User's MongoDB ObjectId
   * @param symbol - Cryptocurrency symbol (e.g., "BTC")
   * @returns Wallet document or null if not found
   */
  async getUserWalletBySymbol(
    userId: string | Types.ObjectId,
    symbol: string
  ): Promise<UserWalletDocument | null> {
    return UserWallet.findOne({
      user: new Types.ObjectId(userId),
      symbol: symbol.toUpperCase(),
    }).populate("user");
  }

  /**
   * Verifies a transaction using the 100Pay API
   *
   * @param transactionId - Transaction ID to verify
   * @returns Transaction verification result
   */
  async verifyTransaction(transactionId: string) {
    try {
      return await this.client.verify(transactionId);
    } catch (error) {
      console.error("Transaction verification failed:", error);
      throw error;
    }
  }

  /**
   * Gets a preview of currency conversion
   *
   * @param amount - Amount to convert
   * @param fromSymbol - Source currency symbol
   * @param toSymbol - Target currency symbol
   * @param appId - Optional application ID
   * @returns Currency conversion preview
   */
  async getConversionPreview(
    amount: number,
    fromSymbol: string,
    toSymbol: string,
    appId?: string
  ) {
    try {
      return await this.client.conversion.preview({
        amount,
        fromSymbol,
        toSymbol,
        appId,
      });
    } catch (error) {
      console.error("Conversion preview failed:", error);
      throw error;
    }
  }

  /**
   * Gets the balance of a specific wallet
   *
   * @param userId - User's MongoDB ObjectId
   * @param symbol - Cryptocurrency symbol (e.g., "BTC")
   * @returns Wallet balance information
   */
  async getWalletBalance(
    userId: string | Types.ObjectId,
    symbol: string
  ): Promise<BalanceResult> {
    try {
      const wallet = await this.getUserWalletBySymbol(userId, symbol);
      if (!wallet) {
        throw new Error(`Wallet with symbol ${symbol} not found`);
      }

      return this.utils.calculateBalance(wallet.sourceAccountId, symbol);
    } catch (error) {
      console.error("Failed to get wallet balance:", error);
      throw error;
    }
  }
  /**
   * Gets the balance of a specific wallet by account ID
   *
   * @param accountId - 100Pay account ID
   * @param symbol - Cryptocurrency symbol (e.g., "BTC")
   * @returns Wallet balance information
   */
  async getWalletBalanceByAccountId(
    accountId: string,
    symbol: string
  ): Promise<BalanceResult> {
    try {
      return this.utils.calculateBalance(accountId, symbol, false);
    } catch (error) {
      console.error("Failed to get wallet balance:", error);
      throw error;
    }
  }

  /**
   * Gets the list of supported cryptocurrencies
   */
  async getSupportedCryptocurrencies() {
    try {
      const response = await this.client.wallet.getSupportedWallets();

      return response.data;
    } catch (error) {
      console.error("Failed to get supported cryptocurrencies:", error);
      throw error;
    }
  }
}
