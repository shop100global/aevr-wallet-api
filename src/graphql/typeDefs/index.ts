import apiKeyTypeDefs from "./apiKey.js";
import googleAuthTypeDefs from "./google.auth.js";
import otpTypeDefs from "./otp.js";
import passwordResetTypeDefs from "./passwordReset.js";
import roleTypeDefs from "./role.js";
import userTypeDefs from "./user.js";
import userWalletTypeDefs from "./userWallet.js";

const globalTypeDefs = `#graphql
  scalar JSON

  input Pagination {
    page: Int
    limit: Int
  }

  type Meta {
    page: Int
    limit: Int
    pages: Int
    total: Int
  }
`;

const typeDefs = `
  ${globalTypeDefs}
  ${userTypeDefs}
  ${roleTypeDefs}
  ${otpTypeDefs}
  ${apiKeyTypeDefs}
  ${googleAuthTypeDefs}
  ${passwordResetTypeDefs}
  ${userWalletTypeDefs}
`;

export default typeDefs;
