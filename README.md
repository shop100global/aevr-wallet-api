
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
- `APP_URL`: http://localhost:9872
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






## Features

- TypeScript Express API with GraphQL
- MongoDB integration with Mongoose
- Docker configuration for development and production
- Web Push notification support
- Email service integration
- Google OAuth authentication

## GraphQL Playground

Access the GraphQL playground at: http://localhost:9872/graphql

## Generated with @untools/starter

This project was scaffolded using [@untools/starter](https://www.npmjs.com/package/@untools/starter).
