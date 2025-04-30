// ./src/utils/userWallet/balance.ts

import {
  Pay100,
  ITransferHistoryItem,
  ITransferHistoryParams,
} from "@100pay-hq/100pay.js";
import { BalanceResult } from "../../types/userWallet/balance.js";

/**
 * Utility class for wallet balance calculation and related operations
 */
export class WalletBalanceUtil {
  private client: Pay100;

  /**
   * Initialize the WalletBalanceUtil
   * @param pay100Client - Initialized Pay100 SDK client
   */
  constructor(pay100Client: Pay100) {
    this.client = pay100Client;
  }

  /**
   * Calculate user wallet balance based on transaction history
   *
   * @param accountId - 100Pay account ID to calculate balance for
   * @param symbol - Cryptocurrency symbol (e.g., "BTC", "ETH")
   * @returns Promise resolving to calculated balance information
   */
  async calculateBalance(
    accountId: string,
    symbol: string,
    returnTransactions = false
  ): Promise<BalanceResult> {
    // Set up history parameters
    const historyParams: ITransferHistoryParams = {
      accountIds: [accountId],
      symbol: symbol,
      // Start with a large limit to get as many transactions as possible
      // In production, you might want to implement pagination if there are many transactions
      limit: 1000,
      page: 1,
    };

    try {
      // Get transfer history from 100Pay API
      const historyResult =
        await this.client.transfer.getHistory(historyParams);

      // Convert API response to our Transaction type
      const transactions = historyResult.data;

      // Calculate different balance types
      return this.processTransactions(transactions, returnTransactions);
    } catch (error) {
      console.error(
        `Failed to calculate balance for account ${accountId}:`,
        error
      );
      throw new Error(
        `Balance calculation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get transaction history for an account with optional filtering
   *
   * @param params - Transfer history parameters
   * @returns Promise resolving to transaction history
   */
  async getTransactionHistory(
    params: ITransferHistoryParams
  ): Promise<ITransferHistoryItem[]> {
    try {
      const historyResult = await this.client.transfer.getHistory(params);
      return historyResult.data;
    } catch (error) {
      console.error("Failed to get transaction history:", error);
      throw new Error(
        `Failed to retrieve transaction history: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get paginated transaction history
   *
   * @param accountId - 100Pay account ID
   * @param symbol - Cryptocurrency symbol
   * @param page - Page number for pagination (default: 1)
   * @param limit - Items per page (default: 20)
   * @returns Promise resolving to paginated transaction history with metadata
   */
  async getPaginatedTransactionHistory(
    accountId: string,
    symbol: string,
    page = 1,
    limit = 20
  ): Promise<{
    transactions: ITransferHistoryItem[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  }> {
    try {
      const historyParams: ITransferHistoryParams = {
        accountIds: [accountId],
        symbol,
        page,
        limit,
      };

      const historyResult =
        await this.client.transfer.getHistory(historyParams);

      return {
        transactions: historyResult.data || [],
        pagination: {
          total: historyResult.meta.total,
          page: historyResult.meta.page,
          limit: historyResult.meta.limit,
          pages: historyResult.meta.pages,
        },
      };
    } catch (error) {
      console.error("Failed to get paginated transaction history:", error);
      throw new Error(
        `Failed to retrieve paginated transaction history: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Calculate balance for multiple wallets at once
   *
   * @param walletInfos - Array of wallet account IDs and symbols
   * @returns Promise resolving to object with account IDs as keys and balance results as values
   */
  async calculateMultipleBalances(
    walletInfos: Array<{ accountId: string; symbol: string }>
  ): Promise<Record<string, BalanceResult>> {
    const balances: Record<string, BalanceResult> = {};

    await Promise.all(
      walletInfos.map(async ({ accountId, symbol }) => {
        try {
          const balance = await this.calculateBalance(accountId, symbol);
          balances[accountId] = balance;
        } catch (error) {
          console.error(
            `Failed to calculate balance for account ${accountId}:`,
            error
          );
          // Don't fail the entire batch if one fails
          balances[accountId] = {
            totalBalance: 0,
            availableBalance: 0,
            pendingCredits: 0,
            pendingDebits: 0,
            transactions: [],
          };
        }
      })
    );

    return balances;
  }

  /**
   * Maps API status to our status format
   */
  private mapTransactionStatus(
    status: string
  ): "successful" | "pending" | "failed" {
    if (status === "completed") return "successful";
    if (status === "pending") return "pending";
    return "failed";
  }

  /**
   * Maps API transaction type to credit/debit format
   */
  private mapTransactionType(
    type: string,
    from: string,
    to: string
  ): "credit" | "debit" {
    // You might need to adjust this logic based on how your system determines credit vs debit
    return type === "credit" ? "credit" : "debit";
  }

  /**
   * Process transactions and calculate balances
   *
   * @param transactions - Array of transactions to process
   * @returns Balance calculation result
   */
  private processTransactions(
    transactions: ITransferHistoryItem[],
    returnTransactions = false
  ): BalanceResult {
    let totalBalance = 0;
    let availableBalance = 0;
    let pendingCredits = 0;
    let pendingDebits = 0;

    for (const tx of transactions) {
      const amount = parseFloat(tx.amount);

      // Skip failed transactions
      if (tx.status === "failed") continue;

      if (tx.type === "credit") {
        if (tx.status === "successful") {
          totalBalance += amount;
          availableBalance += amount;
        } else if (tx.status === "pending") {
          totalBalance += amount;
          pendingCredits += amount;
        }
      } else if (tx.type === "debit") {
        if (tx.status === "successful") {
          totalBalance -= amount;
          availableBalance -= amount;
        } else if (tx.status === "pending") {
          totalBalance -= amount;
          pendingDebits += amount;
        }
      }
    }

    return {
      totalBalance,
      availableBalance,
      pendingCredits,
      pendingDebits,
      transactions: returnTransactions ? transactions : [],
    };
  }
}
