# wallet-api

GraphQL API built with TypeScript, Express, and MongoDB for crypto wallet management using 100Pay's subwallet API.

## Overview

This project demonstrates how to build a comprehensive crypto wallet system using the **100Pay SDK** (`@100pay-hq/100pay.js`). The API provides complete wallet management functionality including:

- Multi-currency wallet creation and management
- Asset transfers between wallets and external addresses
- Real-time balance calculations
- Transaction history tracking
- Transfer fee calculations
- Transaction verification

## Getting Started

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

3. Configure your environment variables in the `.env` file (see Environment Variables section)

4. Start the development server:

```bash
npm run dev
```

## Environment Variables

The following environment variables need to be configured:

### Core Configuration

- `PORT`: 9872 (Server port)
- `APP_NAME`: wallet-api
- `APP_URL`: <https://wallet-api.projects.aevr.space>
- `MONGO_URI`: Local MongoDB connection

### 100Pay Configuration

Add your 100Pay API credentials:

- `PAY100_PUBLIC_KEY`: Your 100Pay public key
- `PAY100_SECRET_KEY`: Your 100Pay secret key
- `PAY100_BASE_URL`: 100Pay API base URL (optional)

### Email Configuration

- `MAIL_HOST`
- `MAIL_PORT`
- `MAIL_USER`
- `MAIL_PASS`
- `MAIL_LOGO`
- `RESEND_API_KEY` (if using Resend)
- `DEFAULT_MAIL_PROVIDER`

### Google OAuth

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`

### Web Push Notifications

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

## 100Pay SDK Integration

This project leverages the **100Pay SDK** (`@100pay-hq/100pay.js`) to provide comprehensive crypto wallet functionality.

### Architecture Overview

The 100Pay SDK is integrated across multiple layers:

- **Service Layer**: `WalletService` and `TransferService` classes handle all 100Pay operations
- **Utility Layer**: `WalletBalanceUtil` for balance calculations and transaction processing
- **GraphQL Layer**: Resolvers expose wallet operations via GraphQL API
- **Database Layer**: Local storage of wallet metadata and user associations

### Key Features

#### 1. Multi-Currency Wallet Creation

Automatically creates subwallets for users. The supported currencies and networks are dynamically retrieved from 100Pay:

```typescript
// Get supported wallets first
const supportedWallets = await walletService.getSupportedWallets();

// Create wallets with supported symbols and networks
const wallets = await walletService.createUserWallets({
  userId: user.id,
  email: user.email,
  name: `${user.firstName} ${user.lastName}`,
  symbols: supportedWallets.map(w => w.symbol), // Dynamic symbols
  networks: supportedWallets.flatMap(w => w.networks.map(n => n.name)) // Dynamic networks
});
```

#### 2. Real-Time Balance Calculation

Balances are calculated in real-time by processing transaction history:

```typescript
const balance = await walletService.calculateBalance(
  accountIds, 
  symbol, 
  includeTransactions
);
```

#### 3. Asset Transfers

Support for both internal (user-to-user) and external (to address) transfers:

```typescript
const transfer = await transferService.transferAssets({
  fromUserId,
  toUserId, // or toAddress for external transfers
  amount,
  symbol,
  network,
  description
});
```

#### 4. Transaction History & Verification

Complete transaction tracking with verification capabilities:

```typescript
const history = await transferService.getTransferHistory(userId, {
  page: 1,
  limit: 10,
  symbol: "ETH"
});

const verified = await walletService.verifyTransaction(transactionId);
```

### SDK Implementation Details

| Operation | Service Class | SDK Method | Purpose |
|-----------|---------------|------------|---------|
| Wallet Creation | `WalletService` | `client.subaccounts.create` | Create subwallets for users |
| Balance Calculation | `WalletBalanceUtil` | `client.transfer.getHistory` | Calculate real-time balances |
| Asset Transfer | `TransferService` | `client.transfer.executeTransfer` | Execute transfers |
| Transfer History | `TransferService` | `client.transfer.getHistory` | Fetch transaction history |
| Fee Calculation | `TransferService` | `client.transfer.calculateFee` | Calculate transfer fees |
| Transaction Verification | `WalletService` | `client.verify` | Verify transactions |
| Supported Wallets | `WalletService` | `client.wallet.getSupportedWallets` | Get available cryptocurrencies and networks |

## Authentication

This API uses **JWT-based authentication** with API key requirements for additional security.

### Headers Required for Requests

```http
Authorization: Bearer <access_token>
x-api-key: <api_key>
```

### Base URL

The GraphQL API is accessible at:

```bash
https://wallet-api.projects.aevr.space/graphql
```

### Authentication Flow

#### 1. Register a New User

```graphql
mutation Register($input: RegisterInput!) {
  register(input: $input) {
    user {
      id
      firstName
      lastName
      email
      emailVerified
      roles {
        name
      }
    }
  }
}
```

#### 2. Verify Email with OTP

**Request OTP**:

```graphql
mutation SendOTP($input: SendOTPInput!) {
  sendOTP(input: $input)
}
```

**Verify OTP**:

```graphql
mutation VerifyOTP($input: VerifyOTPInput!) {
  verifyOTP(input: $input)
}
```

#### 3. Login

```graphql
mutation Login($input: LoginInput!) {
  login(input: $input) {
    accessToken
    refreshToken
    user {
      id
      firstName
      lastName
      email
    }
  }
}
```

## Wallet Operations

### Create User Wallets

After user registration, wallets are automatically created:

```graphql
mutation CreateUserWallets($input: CreateUserWalletsInput!) {
  createUserWallets(input: $input) {
    id
    userId
    symbol
    network
    balance {
      total
      available
      pending
    }
    account {
      id
      address
    }
  }
}
```

### Get User Wallets

Retrieve all wallets for a user:

```graphql
query GetUserWallets($userId: ID!, $symbol: String) {
  getUserWallets(userId: $userId, symbol: $symbol) {
    id
    symbol
    network
    balance {
      total
      available
      pending
    }
    account {
      address
    }
  }
}
```

### Transfer Assets

Transfer cryptocurrency between users or to external addresses:

```graphql
mutation TransferAssets($input: TransferAssetsInput!) {
  transferAssets(input: $input) {
    id
    amount
    symbol
    from
    to
    status
    transactionHash
    fee
  }
}
```

Example input:

```json
{
  "input": {
    "fromUserId": "user123",
    "toUserId": "user456",
    "amount": "0.1",
    "symbol": "ETH",
    "network": "BSC",
    "description": "Payment for services"
  }
}
```

### Get Transfer History

Fetch transaction history with pagination:

```graphql
query GetTransferHistory($userId: ID!, $params: TransferHistoryParams) {
  getTransferHistory(userId: $userId, params: $params) {
    transfers {
      id
      amount
      symbol
      from
      to
      status
      createdAt
      transactionHash
    }
    pagination {
      page
      limit
      total
      hasNext
    }
  }
}
```

### Calculate Transfer Fee

Get fee estimation before executing transfers:

```graphql
query CalculateTransferFee($input: TransferFeeInput!) {
  calculateTransferFee(input: $input) {
    fee
    symbol
    network
  }
}
```

## Supported Cryptocurrencies

The wallet dynamically supports cryptocurrencies and networks as provided by the 100Pay platform. To get the current list of supported wallets and their available networks, use:

```graphql
query GetSupportedWallets {
  getSupportedWallets {
    symbol
    name
    networks {
      name
      chainId
      rpcUrl
      blockExplorer
    }
    decimals
    logoUrl
  }
}
```

The SDK method `client.wallet.getSupportedWallets()` returns real-time information about:

- Available cryptocurrency symbols and names
- Supported blockchain networks for each currency
- Network details (chain ID, RPC URLs, block explorers)
- Token decimals and logo URLs

This ensures your wallet always supports the latest cryptocurrencies and networks available on the 100Pay platform without requiring code updates.

## Security Features

- **JWT Authentication**: Secure user sessions
- **API Key Protection**: Additional layer of API security
- **Transaction Verification**: Built-in transaction verification
- **Real-time Validation**: Live balance and transaction validation
- **Secure Key Management**: Environment-based API key storage

## Error Handling

Common error responses:

- **401 Unauthorized**: Missing or invalid access token
- **403 Forbidden**: Insufficient permissions or invalid API key
- **404 Not Found**: Wallet or transaction not found
- **400 Bad Request**: Invalid transfer parameters or insufficient balance
- **500 Internal Server Error**: 100Pay API or server issues

## Development

### Project Structure

```bash
src/
├── services/
│   ├── userWallet.services.ts    # Wallet management
│   └── transfer.services.ts      # Transfer operations
├── utils/
│   └── userWallet/
│       └── balance.ts           # Balance calculations
├── graphql/
│   └── resolvers/
│       ├── userWallet.resolvers.ts
│       └── transfer.resolvers.ts
└── types/
    └── userWallet/              # TypeScript definitions
```

### Testing

Run the development server and access the GraphQL playground at:

```bash
http://localhost:9872/graphql
```

## Production Deployment

The API is deployed at:

```bash
https://wallet-api.projects.aevr.space/graphql
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project demonstrates the integration of 100Pay's subwallet API for educational and development purposes.

---

**Built with**: TypeScript, Express, GraphQL, MongoDB, and 100Pay SDK

**Generated with**: [@untools/starter](https://www.npmjs.com/package/@untools/starter)
