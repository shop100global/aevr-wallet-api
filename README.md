# wallet-api

GraphQL API built with TypeScript, Express, and MongoDB.

## Getting Started

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

3. Configure your environment variables in the `.env` file

4. Start the development server:

```bash
npm run dev
```

## Environment Variables

The following environment variables have been pre-configured:

- `PORT`: 9872 (Server port)
- `APP_NAME`: wallet-api
- `APP_URL`: <https://wallet-api.projects.aevr.space>
- `MONGO_URI`: Local MongoDB connection
- `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`: Generated for Web Push notifications

### Email Configuration

Update the following variables with your email service credentials:

- `MAIL_HOST`
- `MAIL_PORT`
- `MAIL_USER`
- `MAIL_PASS`
- `MAIL_LOGO`
- `RESEND_API_KEY` (if using Resend)
- `DEFAULT_MAIL_PROVIDER`

### Google OAuth

Update the following variables with your Google OAuth credentials:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`

## Authentication

This API uses **JWT-based authentication**. Most endpoints require an `Authorization` header with a valid access token. Additionally, to interact with the API, you must include a valid API key in the `x-api-key` header.

### Headers Required for Requests

- **Authorization**: Include a valid JWT access token.
- **x-api-key**: Include a valid API key.

Example:

```http
Authorization: Bearer <access_token>
x-api-key: <api_key>
```

### Base URL

The GraphQL API is accessible at:

```
https://wallet-api.projects.aevr.space/graphql
```

### Authentication Flow

#### 1. Register a New User

Register a new user account with the following mutation:

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

Input:

```json
{
  "input": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "password": "securepassword"
  }
}
```

Response:

```json
{
  "data": {
    "register": {
      "user": {
        "id": "12345",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "emailVerified": false,
        "roles": [
          {
            "name": "user"
          }
        ]
      }
    }
  }
}
```

#### 2. Verify Email with OTP

Before logging in, users must verify their email address using a one-time password (OTP). Use the following mutations to request and verify an OTP:

**Request OTP**:

```graphql
mutation SendOTP($input: SendOTPInput!) {
  sendOTP(input: $input)
}
```

Input:

```json
{
  "input": {
    "email": "john.doe@example.com"
  }
}
```

Response:

```json
{
  "data": {
    "sendOTP": "OTP sent to john.doe@example.com successfully"
  }
}
```

**Verify OTP**:

```graphql
mutation VerifyOTP($input: VerifyOTPInput!) {
  verifyOTP(input: $input)
}
```

Input:

```json
{
  "input": {
    "email": "john.doe@example.com",
    "otp": "123456"
  }
}
```

Response:

```json
{
  "data": {
    "verifyOTP": true
  }
}
```

#### 3. Login

Once the email is verified, users can log in and retrieve access and refresh tokens:

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
      roles {
        name
      }
    }
  }
}
```

Input:

```json
{
  "input": {
    "email": "john.doe@example.com",
    "password": "securepassword"
  }
}
```

Response:

```json
{
  "data": {
    "login": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "12345",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "roles": [
          {
            "name": "user"
          }
        ]
      }
    }
  }
}
```

#### 4. Using Authentication Tokens

Include the access token in the `Authorization` header for protected requests:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 5. Refresh Token

When an access token expires, refresh it using:

```graphql
mutation RefreshToken($token: String!) {
  refreshToken(token: $token) {
    accessToken
  }
}
```

Input:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Response:

```json
{
  "data": {
    "refreshToken": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

#### 6. Get Current User

Retrieve the currently authenticated user's details:

```graphql
query Me {
  me {
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
```

Response:

```json
{
  "data": {
    "me": {
      "id": "12345",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "emailVerified": true,
      "roles": [
        {
          "name": "user"
        }
      ]
    }
  }
}
```

### Password Reset

#### 1. Request Password Reset

Request a password reset email:

```graphql
mutation RequestPasswordReset($email: String!) {
  requestPasswordReset(email: $email)
}
```

Input:

```json
{
  "email": "john.doe@example.com"
}
```

Response:

```json
{
  "data": {
    "requestPasswordReset": true
  }
}
```

#### 2. Reset Password

Reset the password using the token sent via email:

```graphql
mutation ResetPassword($token: String!, $password: String!) {
  resetPassword(token: $token, password: $password)
}
```

Input:

```json
{
  "token": "reset-token-from-email",
  "password": "newsecurepassword"
}
```

Response:

```json
{
  "data": {
    "resetPassword": true
  }
}
```

### Google OAuth Authentication

Authenticate a user via Google OAuth:

```graphql
mutation GoogleAuth($code: String!) {
  googleAuth(code: $code) {
    accessToken
    refreshToken
    user {
      id
      firstName
      lastName
      email
      roles {
        name
      }
    }
  }
}
```

Input:

```json
{
  "code": "google-oauth-code"
}
```

Response:

```json
{
  "data": {
    "googleAuth": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "12345",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "roles": [
          {
            "name": "user"
          }
        ]
      }
    }
  }
}
```

### Roles and Permissions

Get all available roles:

```graphql
query Roles {
  roles {
    id
    name
  }
}
```

Response:

```json
{
  "data": {
    "roles": [
      {
        "id": "1",
        "name": "user"
      },
      {
        "id": "2",
        "name": "admin"
      }
    ]
  }
}
```

### API Keys (Admin Only)

Generate an API key for a user:

```graphql
mutation GenerateApiKey {
  generateApiKey {
    id
    key
    owner {
      id
      email
    }
    createdAt
  }
}
```

Response:

```json
{
  "data": {
    "generateApiKey": {
      "id": "123",
      "key": "generated-api-key",
      "owner": {
        "id": "12345",
        "email": "admin@example.com"
      },
      "createdAt": "2025-04-27T12:00:00.000Z"
    }
  }
}
```

## Features

- TypeScript Express API with GraphQL
- MongoDB integration with Mongoose
- JWT-based authentication system
- Password reset functionality
- Google OAuth integration
- OTP verification
- Role-based access control
- API key generation
- Docker configuration for development and production
- Web Push notification support
- Email service integration

## GraphQL Playground

Access the GraphQL playground at: <https://wallet-api.projects.aevr.space/graphql>

## Common Errors

- **401 Unauthorized**: Missing or invalid access token
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Unexpected server error

## Generated with @untools/starter

This project was scaffolded using [@untools/starter](https://www.npmjs.com/package/@untools/starter).
