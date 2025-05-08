// ./src/services/userWallet.services.ts

import {
  Pay100,
  CreateSubAccountData,
  Account,
  AccountDetails,
} from "@100pay-hq/100pay.js";
import { Types } from "mongoose";
import {
  BalanceResult,
  UserWallet as UserWalletType,
  UserWalletDocument,
} from "../types/userWallet/index.js";
import UserWallet from "../models/userWallet.model.js";
import { Filters, UserWalletFilters } from "../utils/filters/index.js";
import paginateCollection, { Pagination } from "../utils/paginate.js";
import { WalletBalanceUtil } from "../utils/userWallet/balance.js";
import { logger } from "@untools/logger";

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
      // check if user has already created a wallet with the same symbols and networks
      const existingWallets = await this.getFilteredUserWallets({
        filters: {
          userId: userId.toString(),
          symbols,
          networks,
        },
      });

      if (existingWallets.data.length > 0) {
        throw new Error(
          `User already has wallets with the same symbols and networks: ${existingWallets.data.map(
            (wallet) => wallet.symbol
          )}, ${existingWallets.data.map((wallet) => wallet.network)}`
        );
      }

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
      // contractAddress: account.contractAddress,
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
    filters = {},
    pagination = { page: 1, limit: 10 },
  }: {
    filters?: Filters.UserWalletFilterOptions;
    pagination?: Pagination;
  }) {
    const constructedFilters = UserWalletFilters({ filters: filters });
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
    symbol: string,
    network?: string
  ): Promise<UserWalletDocument | null> {
    return UserWallet.findOne({
      user: userId,
      symbol: symbol.toUpperCase(),
      network: network,
    }).populate("user");
  }

  /**
   * Retrieves user wallets associated with any of the given account addresses.
   *
   * @param {string[]} accountAddress - An array of account addresses to search for.
   * @returns {Promise<UserWalletDocument[]>} A promise that resolves to an array of user wallet documents populated with user data.
   */
  async getUserWalletByAccountAddress(
    accountAddress: string[]
  ): Promise<UserWalletDocument[]> {
    return UserWallet.find({
      "account.address": { $in: accountAddress },
    }).populate("user");
  }

  /**
   * Gets a specific wallet by accountId for a user
   * @param accountId - 100Pay account ID
   * @returns {Promise<UserWalletDocument | null>} A promise that resolves to a user wallet document or null if not found.
   */
  async getUserWalletByAccountId(
    accountId: string
  ): Promise<UserWalletDocument | null> {
    return UserWallet.findOne({
      sourceAccountId: accountId,
    }).populate("user");
  }

  /**
   * Gets merged data of user wallets and supported wallets
   *
   * @param filters - Filter options for wallets
   * @param page - Page number for pagination
   * @param limit - Number of records per page
   * @returns Paginated wallet data
   */
  async getSupportedWallets({
    filters = {},
    pagination = { page: 1, limit: 100 },
  }: {
    filters?: Filters.UserWalletFilterOptions;
    pagination?: Pagination;
  }) {
    let supportedWallets = await this.getSupportedCryptocurrencies();
    supportedWallets = filters.symbols
      ? supportedWallets.filter((wallet) =>
          filters.symbols.includes(wallet.symbol)
        )
      : supportedWallets;
    const constructedFilters = UserWalletFilters({ filters: filters });
    const userWalletsData = await paginateCollection(
      UserWallet,
      {
        page: pagination.page,
        limit: pagination.limit,
      },
      {
        filter: {
          ...constructedFilters,
          symbol: { $in: supportedWallets.map((wallet) => wallet.symbol) },
        },
        populate: "user",
      }
    );

    const mergedWallets = supportedWallets.map((supportedWallet) => {
      const userWalletsForSymbol = userWalletsData.data.filter(
        (userWallet) => userWallet.symbol === supportedWallet?.symbol
      );
      const mergedWallet: UserWalletType & {
        accounts: AccountDetails[];
      } = {
        ...supportedWallet,
        accounts: userWalletsForSymbol.map((userWallet) => userWallet.account),
        decimals:
          userWalletsForSymbol[0]?.decimals ||
          supportedWallet?.decimals?.toString(),
        accountType: userWalletsForSymbol[0]?.accountType,
        account:
          userWalletsForSymbol[0]?.account ||
          (supportedWallet?.account as AccountDetails),
        // contractAddress: userWalletsForSymbol[0]?.contractAddress,
        appId: userWalletsForSymbol[0]?.appId,
        network: userWalletsForSymbol[0]?.network,
        ownerId: userWalletsForSymbol[0]?.ownerId,
        parentWallet: userWalletsForSymbol[0]?.parentWallet,
        sourceAccountId: userWalletsForSymbol[0]?.sourceAccountId,
        status: userWalletsForSymbol[0]?.status,
        user: userWalletsForSymbol[0]?.user,
        userId: userWalletsForSymbol[0]?.userId,
        // decimals: userWalletsForSymbol[0]?.decimals,
        // logo: userWalletsForSymbol[0]?.logo,
        // name: userWalletsForSymbol[0]?.name,
        // symbol: userWalletsForSymbol[0]?.symbol,
        walletType: userWalletsForSymbol[0]?.walletType,
        createdAt: userWalletsForSymbol[0]?.createdAt,
        updatedAt: userWalletsForSymbol[0]?.updatedAt,
      };
      return mergedWallet;
    });

    return {
      data: mergedWallets,
      meta: { ...userWalletsData.meta, total: mergedWallets.length },
    };
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

      return this.utils.calculateBalance([wallet.sourceAccountId], symbol);
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
      return this.utils.calculateBalance([accountId], symbol, false);
    } catch (error) {
      console.error("Failed to get wallet balance:", error);
      throw error;
    }
  }

  /**
   * Gets the balances of multiple wallets by their account addresses.
   *
   * @param addresses - An array of blockchain account addresses to check.
   * @param symbol - Cryptocurrency symbol (e.g., "BTC").
   * @returns A promise that resolves to an array of wallet balance information.
   */
  async getWalletBalanceByAccountAddress(
    addresses: string[],
    symbol: string
  ): Promise<BalanceResult> {
    try {
      const wallets = await this.getUserWalletByAccountAddress(addresses);

      if (!wallets.length) {
        throw new Error(
          `No wallets found for addresses: ${addresses.join(", ")}`
        );
      }

      const balances = await this.utils.calculateMultipleBalances(
        wallets.map((wallet) => ({
          accountId: wallet.sourceAccountId,
          symbol: wallet.symbol,
        }))
      );

      const aggregated = Object.values(balances).reduce<BalanceResult>(
        (acc, curr) => {
          acc.totalBalance += curr.totalBalance;
          acc.availableBalance += curr.availableBalance;
          acc.pendingCredits += curr.pendingCredits;
          acc.pendingDebits += curr.pendingDebits;
          acc.transactions.push(...(curr.transactions || []));
          return acc;
        },
        {
          totalBalance: 0,
          availableBalance: 0,
          pendingCredits: 0,
          pendingDebits: 0,
          transactions: [],
        }
      );

      return aggregated;
    } catch (error) {
      console.error("Failed to get wallet balances:", error);
      return {
        totalBalance: 0,
        availableBalance: 0,
        pendingCredits: 0,
        pendingDebits: 0,
        transactions: [],
      };
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
