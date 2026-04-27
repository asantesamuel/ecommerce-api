# E-Commerce Backend API

Production-oriented REST API for a multi-role e-commerce platform built with Node.js, Express, TypeScript, TypeORM, and PostgreSQL.

## Purpose

This API powers a marketplace-style platform where:

- customers browse products, manage carts, and place orders
- vendors onboard, pay a one-time fee, upload verification documents, and manage listings
- admins moderate users and products, inspect orders, and review analytics

## Core Features

### Customer features

- account registration and login with JWT auth
- refresh-token based session renewal
- product browsing with search, category filters, and pagination
- cart creation and cart item management
- checkout with Paystack payment initialization
- order history and order detail retrieval
- social features for friend requests and shared carts

### Vendor features

- vendor registration during signup
- Paystack onboarding fee payment
- document submission for review
- product creation, updates, and soft deletion
- vendor-specific order views

### Admin features

- user account status management
- platform-wide order inspection
- low-stock inventory alerts
- product moderation queue
- analytics for users, vendors, orders, revenue, and top-selling products

## Payments

The project uses Paystack for payments.

- customer checkout transactions are initialized through Paystack
- vendor onboarding fees are initialized through Paystack
- webhook events are verified with the Paystack signature
- refunds are issued through the Paystack API

## File Uploads

Uploads use direct-to-S3 flows.

1. The client requests a presigned upload URL from `/uploads/presign`
2. The client uploads the file directly to S3
3. The client confirms the upload with `/uploads/confirm`
4. The application stores the resulting key and uses a CDN or signed URL as needed

Product images use public CDN URLs. Vendor documents use signed access URLs.

## Main Modules

- `auth`: registration, login, refresh, logout
- `products`: catalog browsing and vendor product management
- `categories`: category CRUD
- `cart`: cart retrieval and cart item management
- `orders`: checkout, order history, vendor orders, refunds
- `payments`: Paystack webhook handling
- `vendors`: onboarding fee payments, vendor profiles, and documents
- `uploads`: S3 presign and confirmation endpoints
- `admin`: moderation, user management, analytics, and ops views
- `social`: friendships and shared carts
- `users`: authenticated user profile endpoints

## Tech Stack

- Node.js 20+
- Express 5
- TypeScript 5
- TypeORM
- PostgreSQL 16
- Redis
- Paystack
- AWS S3
- tsoa + Swagger UI
- Jest + Supertest

## Local Development

### Prerequisites

- Node.js 20+
- Docker Desktop
- PostgreSQL via Docker
- Redis via Docker
- Paystack account
- AWS account for S3

### Setup

```bash
npm install
docker-compose up -d postgres redis
npm run migration:run
npm run build:routes
npm run dev
```

The API runs on `http://localhost:3000`.

Swagger UI is available at `http://localhost:3000/docs`.

## Useful Scripts

```bash
npm run dev
npm run build
npm run build:routes
npm run migration:run
npm run migration:revert
npm test
npm run test:coverage
npm run lint
```

## Environment Variables

Important variables include:

- `DATABASE_URL`
- `DATABASE_URL_TEST`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_PUBLIC_KEY`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `S3_BUCKET_PRODUCTS`
- `S3_BUCKET_DOCUMENTS`
- `CLOUDFRONT_DOMAIN`
- `FRONTEND_URL`
- `REDIS_URL`

## Local Services

`docker-compose.yml` provides:

- `postgres` on port `5432`
- `postgres_test` on port `5433`
- `pgadmin` on port `8080`
- `redis` on port `6379`
