const userWalletTypeDefs = `#graphql
  type BalanceResult {
    totalBalance: Float
    availableBalance: Float
    pendingCredits: Float
    pendingDebits: Float
    availableBalanceInUsd: Float
  }

  type Fee {
    transfer: Float
    convert: Float
  }

  type SupportedWallet {
    name: String
    symbol: String
    decimals: String
    networks: [String]
    hotwallet: String
    balance: BalanceResult
    account: Account
    fee: Fee
    # contractAddress: String
    contract: String
    logo: String
    # for merged wallets
    accounts: [Account]
    wallets(pagination: Pagination, filters: UserWalletFilter): UserWalletsData
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
    # contractAddress: String
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
    symbols: [String]
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

  type SupportedWalletsData {
    data: [SupportedWallet]
    meta: Meta
  }

  type Query {
    getUserWallets(filters: UserWalletFilter, pagination: Pagination): UserWalletsData
    getUserWalletBySymbol(userId: ID, symbol: String): UserWallet
    getSupportedWallets(filters: UserWalletFilter, pagination: Pagination): SupportedWalletsData
    getSupportedCryptocurrencies: [SupportedWallet]
  }

  type Mutation {
    createUserWallets(input: CreateUserWalletsInput): [UserWallet]
  }
`;

export default userWalletTypeDefs;
