# syntax = docker/dockerfile:1.2

FROM node:lts as builder

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

# Mount the secret, copy it to project root
RUN --mount=type=secret,id=_env,dst=/etc/secrets/.env cp /etc/secrets/.env .env && npm ci

COPY . .

# If needed again during compile step
RUN --mount=type=secret,id=_env,dst=/etc/secrets/.env cp /etc/secrets/.env .env && npm run compile

# RUN npm run compile

FROM node:lts-slim

ENV NODE_ENV production
USER node

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

RUN npm ci --production

COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 8080
CMD [ "node", "dist/index.js" ]