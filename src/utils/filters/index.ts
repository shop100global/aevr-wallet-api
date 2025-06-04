// src/utils/filters.ts
import mongoose, { FilterQuery } from "mongoose";
import { UserWalletDocument } from "../../types/userWallet/index.js";

/**
 * Type for all filter options used in the wallet service
 */
export namespace Filters {
  export interface UserWalletFilterOptions {
    accountIds?: string[];
    userId?: string;
    name?: string;
    symbols?: string[];
    networks?: string[];
    status?: string;
    accountType?: string;
    walletType?: string;
    network?: string;
    appId?: string;
    ownerId?: string;
    parentWallet?: string;
    sourceAccountId?: string;
    createdAfter?: Date | string;
    createdBefore?: Date | string;
    updatedAfter?: Date | string;
    updatedBefore?: Date | string;
    // contractAddress?: string;
  }
}

/**
 * Helper function to check if a string is a valid MongoDB ObjectId
 */
const isValidObjectId = (id?: string): boolean => {
  if (!id) return false;
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Helper function to convert string dates to Date objects
 */
const getDateFilter = (dateString?: Date | string): Date | undefined => {
  if (!dateString) return undefined;
  return dateString instanceof Date ? dateString : new Date(dateString);
};

/**
 * Creates filter conditions for UserWallet queries
 * @param filters - User wallet filter options
 * @returns MongoDB filter query
 */
export const UserWalletFilters = ({
  filters = {},
}: {
  filters: Filters.UserWalletFilterOptions;
}): FilterQuery<UserWalletDocument> => {
  // Construct the filter object
  const constructedFilters: FilterQuery<UserWalletDocument> = {
    // Basic filters
    // ...(filters.id &&
    //   (isValidObjectId(filters.id) ? { _id: filters.id } : { id: filters.id })),
    ...(filters.accountIds &&
      filters.accountIds.length > 0 && {
        sourceAccountId: {
          $in: filters.accountIds.map((id) => new mongoose.Types.ObjectId(id)),
        },
      }),

    // User relation filter
    ...(filters.userId && {
      user: isValidObjectId(filters.userId) ? filters.userId : undefined,
    }),

    // String fields with case-insensitive regex matching
    ...(filters.name && { name: { $regex: filters.name, $options: "i" } }),
    ...(filters.symbols && {
      symbol: { $in: filters.symbols },
    }),
    ...(filters.networks && {
      network: { $in: filters.networks },
    }),

    // Exact match filters
    ...(filters.status && { status: filters.status }),
    ...(filters.accountType && { accountType: filters.accountType }),
    ...(filters.walletType && { walletType: filters.walletType }),
    ...(filters.network && { network: filters.network }),
    ...(filters.appId && { appId: filters.appId }),
    ...(filters.ownerId && { ownerId: filters.ownerId }),
    ...(filters.parentWallet && { parentWallet: filters.parentWallet }),
    ...(filters.sourceAccountId && {
      sourceAccountId: filters.sourceAccountId,
    }),
    // ...(filters.contractAddress && {
    //   contractAddress: filters.contractAddress,
    // }),

    // Date filters
    ...(filters.createdAfter && {
      createdAt: { $gte: getDateFilter(filters.createdAfter) },
    }),
    ...(filters.createdBefore && {
      createdAt: { $lte: getDateFilter(filters.createdBefore) },
    }),
    ...(filters.updatedAfter && {
      updatedAt: { $gte: getDateFilter(filters.updatedAfter) },
    }),
    ...(filters.updatedBefore && {
      updatedAt: { $lte: getDateFilter(filters.updatedBefore) },
    }),
  };

  return constructedFilters;
};
