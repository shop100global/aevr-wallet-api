import { ITransferHistoryItem } from "@100pay-hq/100pay.js";

/**
 * Balance calculation result with different balance types
 */
export interface BalanceResult {
  /** Total of all successful transactions */
  totalBalance: number;
  /** Balance excluding pending transactions */
  availableBalance: number;
  /** Total of pending credits */
  pendingCredits: number;
  /** Total of pending debits */
  pendingDebits: number;
  /** All transactions processed */
  transactions?: ITransferHistoryItem[];
}
