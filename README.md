# 🛒 E-Commerce Backend API

A production-ready REST API for managing core e-commerce operations — built with **Node.js**, **Express**, **TypeScript**, **TypeORM**, and **PostgreSQL**. API documentation is auto-generated via **tsoa** and served through **Swagger UI**.

---

## 🧩 What This API Does

This API powers the backend of an e-commerce platform where customers can browse products, manage a shopping cart, and complete purchases. Vendors can register their businesses and list products for sale. Administrators oversee the entire platform.

### For Customers
- Register an account and log in securely with JWT authentication
- Browse and search the product catalogue with filters and pagination
- View detailed product pages including images, pricing, and stock availability
- Add and remove items from a personal shopping cart
- Proceed through checkout and complete payment via **Stripe**
- View full order history and individual order details
- Send and accept friend requests with other users on the platform
- Share shopping cart contents with connected friends

### For Vendors
- Apply for a vendor account by submitting business documentation
- Pay a one-time onboarding fee via Stripe before the application is reviewed
- List, update, and manage their own product catalogue
- Upload product images directly to **AWS S3** via pre-signed URLs
- Manage stock quantities and pricing for their listings
- View orders that contain their products

### For Admins
- Manage all user accounts — suspend, reactivate, and promote users
- Review vendor applications and approve or reject with written reasons
- Moderate product listings — unpublish, flag, or remove any listing
- View and manage all orders platform-wide and process refunds
- Manage product categories and platform configuration
- Access analytics — order volume, revenue, new signups, and top products

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | Express 5 |
| Language | TypeScript 5 (strict mode) |
| ORM | TypeORM |
| Database | PostgreSQL 16 |
| Authentication | JSON Web Tokens (JWT) |
| API Docs | tsoa + Swagger UI |
| Payments | Stripe |
| File Storage | AWS S3 + CloudFront CDN |
| Validation | class-validator + class-transformer |
| Testing | Jest + Supertest |
| Local DB | Docker + Docker Compose |

---

## 📁 Project Structure

```
src/
├── config/          # Database, Stripe, S3, and environment config
├── entities/        # TypeORM entity classes (database tables)
├── modules/         # Feature modules — one folder per domain
│   ├── auth/        # Register, login, token refresh
│   ├── users/       # User profiles and friend management
│   ├── products/    # Product catalogue and vendor listings
│   ├── categories/  # Product category management
│   ├── cart/        # Shopping cart — add, remove, view
│   ├── orders/      # Checkout and order history
│   ├── payments/    # Stripe payment intents and webhooks
│   ├── vendors/     # Vendor onboarding and document upload
│   ├── social/      # Friendships and shared carts
│   ├── uploads/     # S3 pre-signed URL generation
│   └── admin/       # Admin-only management routes
├── middlewares/     # JWT auth, role guard, rate limiter, error handler
├── migrations/      # TypeORM database migrations
├── types/           # Express type augmentations
└── utils/           # JWT helpers, bcrypt wrappers, pagination
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- Docker Desktop
- AWS account (for S3 image uploads)
- Stripe account (for payments)

### 1. Clone the repository
```bash
git clone https://github.com/your-username/ecommerce-api.git
cd ecommerce-api
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
```bash
cp .env.example .env
```
Open `.env` and fill in your database, JWT, Stripe, and AWS credentials.

Generate secure JWT secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Run it twice — one for `JWT_ACCESS_SECRET` and one for `JWT_REFRESH_SECRET`.

### 4. Start the database
```bash
docker-compose up -d postgres
```

### 5. Run database migrations
```bash
npm run migration:run
```

### 6. Generate tsoa routes and Swagger docs
```bash
npm run build:routes
```

### 7. Start the development server
```bash
npm run dev
```

The API is now running at `http://localhost:3000`  
Swagger UI is available at `http://localhost:3000/docs`

---

## 🔐 Authentication

The API uses **JWT (JSON Web Tokens)** for stateless authentication.

- **Access token** — expires in 15 minutes, sent in the `Authorization: Bearer <token>` header
- **Refresh token** — expires in 7 days, used to obtain a new access token without re-logging in

All routes except `POST /auth/register` and `POST /auth/login` require a valid access token.

### User Roles

| Role | Description |
|---|---|
| `customer` | Default role — browse, buy, and connect with others |
| `vendor` | Approved business owners who can list products for sale |
| `admin` | Platform administrators with full system access |

---

## 💳 Payments

Payments are handled entirely through **Stripe**.

- Customers pay for orders via Stripe Checkout
- Vendors pay a one-time onboarding fee before their application is reviewed
- Refunds are processed through the admin interface via the Stripe API
- Webhook events from Stripe are verified using the Stripe signing secret and used to update order status automatically

---

## 🖼️ Image Uploads

Product images and vendor documents are never routed through the API server. The flow uses **S3 pre-signed URLs**:

1. Client requests a pre-signed upload URL from the API
2. Client uploads the file directly to S3 from the browser
3. Client notifies the API of the completed upload
4. The API stores the resulting CloudFront CDN URL in the database

Product images are served publicly via CloudFront. Vendor documents are stored in a private bucket and only accessible to admins via time-limited URLs.

---

## 🧪 Running Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage
```

---

## 📜 Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run build:routes` | Regenerate tsoa routes and Swagger spec |
| `npm run migration:run` | Apply pending database migrations |
| `npm run migration:generate` | Generate a migration from entity changes |
| `npm run migration:revert` | Revert the last applied migration |
| `npm test` | Run the test suite |
| `npm run lint` | Run ESLint across the codebase |
| `npm run format` | Format code with Prettier |

---

## 📖 API Documentation

Interactive Swagger UI documentation is automatically generated from controller decorators via **tsoa** and is available at:

```
http://localhost:3000/docs
```

To regenerate the documentation after making changes to any controller:

```bash
npm run build:routes
```

---

## 🗄️ Database

PostgreSQL runs locally via Docker. To manage your local database:

```bash
# Start the database
docker-compose up -d postgres

# Stop the database
docker-compose down

# View database logs
docker logs ecommerce_db

# Open a direct psql session
docker exec -it ecommerce_db psql -U ecommerce_user -d ecommerce_dev
```

A **pgAdmin** instance is also available for visual database management at `http://localhost:8080` — log in with `admin@admin.com` / `admin`, then register the server using host `postgres`, port `5432`.

---

## 🌍 Environment Variables

See `.env.example` for the full list of required environment variables. Key ones include:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `AWS_REGION` | AWS region for S3 |
| `S3_BUCKET_PRODUCTS` | S3 bucket for product images |
| `S3_BUCKET_DOCUMENTS` | S3 bucket for vendor documents (private) |
| `CLOUDFRONT_DOMAIN` | CDN domain for serving product images |

---

## 📄 License

MIT

# E-Commerce API

Node.js · Express · TypeScript · TypeORM · PostgreSQL · tsoa

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the database
docker-compose up -d postgres

# 3. Copy and fill in environment variables
cp .env.example .env

# 4. Run database migrations
npm run migration:run

# 5. Generate tsoa routes + Swagger spec
npm run build:routes

# 6. Start the dev server
npm run dev
```

API runs at: http://localhost:3000
Swagger UI:  http://localhost:3000/docs

## Key Commands

| Command                    | Description                          |
|----------------------------|--------------------------------------|
| `npm run dev`              | Dev server with hot reload           |
| `npm run build`            | Production build                     |
| `npm run build:routes`     | Regenerate tsoa routes + swagger.json|
| `npm run migration:run`    | Apply pending migrations             |
| `npm run migration:generate` | Generate migration from entity changes |
| `npm test`                 | Run test suite                       |
