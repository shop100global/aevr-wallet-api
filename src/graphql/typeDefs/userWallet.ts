const userWalletTypeDefs = `#graphql
  type BalanceResult {
    totalBalance: Float
    availableBalance: Float
    pendingCredits: Float
    pendingDebits: Float
  }

  type Account {
    address: String
    key: JSON
    network: String
  }

  type UserWallet {
    id: ID
    user: User
    accountType: String
    walletType: String
    status: String
    name: String
    symbol: String
    decimals: String
    account: Account
    contractAddress: String
    logo: String
    userId: String
    appId: String
    network: String
    ownerId: String
    parentWallet: String
    sourceAccountId: String
    balance: BalanceResult
    createdAt: String
    updatedAt: String
  }

  # Filter inputs
  input UserWalletFilter {
    name: String
    symbol: String
    status: String
    userId: String
    appId: String
    network: String
    ownerId: String
    parentWallet: String
    sourceAccountId: String
  }

  input CreateUserWalletsInput {
    phone: String
    symbols: [String]
    networks: [String]
    metadata: JSON
  }

  type UserWalletsData {
    data: [UserWallet]
    meta: Meta
  }

  type Query {
    getUserWallets(filter: UserWalletFilter, pagination: Pagination): UserWalletsData
    getUserWalletBySymbol(userId: ID, symbol: String): UserWallet
  }

  type Mutation {
    createUserWallets(input: CreateUserWalletsInput): [UserWallet]
  }
`;

export default userWalletTypeDefs;
