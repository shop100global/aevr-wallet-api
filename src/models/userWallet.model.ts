// ./src/models/userWallet.model.ts

import { model, Schema } from "mongoose";
import {
  UserWalletDocument,
  UserWalletModel,
} from "../types/userWallet/index.js";

const userWalletSchema = new Schema<UserWalletDocument, UserWalletModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    accountType: String,
    walletType: String,
    status: String,
    name: String,
    symbol: String,
    decimals: String,
    account: {
      address: String,
      key: Object,
      network: String,
    },
    // contractAddress: String,
    logo: String,
    userId: String,
    appId: String,
    network: String,
    ownerId: String,
    parentWallet: String,
    sourceAccountId: String,
  },
  {
    timestamps: true,
  }
);

const UserWallet = model<UserWalletDocument, UserWalletModel>(
  "UserWallet",
  userWalletSchema
);

export default UserWallet;
