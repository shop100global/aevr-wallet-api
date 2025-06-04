import { Document, Model, Types } from "mongoose";
import { AccountDetails } from "@100pay-hq/100pay.js";

export interface UserWallet {
  user: Types.ObjectId;
  accountType: string;
  walletType: string;
  status: string;
  name: string;
  symbol: string;
  decimals: string;
  account: AccountDetails;
  // contractAddress: string;
  logo: string;
  userId: string;
  appId: string;
  network: string;
  ownerId: string;
  parentWallet: string;
  sourceAccountId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWalletDocument extends UserWallet, Document {}

export interface UserWalletModel extends Model<UserWalletDocument> {}

export * from "./balance.js";
