# Calibrax - Retail Pricing Intelligence Platform

A comprehensive pricing intelligence system that helps merchandisers quickly understand how internal products are priced relative to competitors and identify actionable repricing opportunities.

## Overview

Calibrax is an MVP (Minimum Viable Product) designed to centralize pricing data and surface clear signals that guide repricing decisions. The system prioritizes **clarity, explainability, and speed of decision-making** over advanced automation or machine learning.

### Key Features

- **Overpriced Products Analysis**: Identify products where internal pricing is meaningfully higher than competitor pricing
- **Pricing Patterns Analysis**: Understand systemic pricing behavior across competitors and vendors
- **Product Matching**: Track product matches with confidence scores and match quality indicators
- **Unit Price Normalization**: Automatically normalize prices across different units (weight, volume, count)
- **Interactive Dashboards**: Clean, readable analysis views built with modern UI components

## Tech Stack

### Backend
- **Node.js** with **Express** - RESTful API server
- **TypeScript** - Type-safe development
- **Drizzle ORM** - Type-safe database queries and migrations
- **PostgreSQL** - Relational database
- **Zod** - Runtime type validation

### Frontend
- **Next.js 16** (App Router) - React framework
- **TypeScript** - Type-safe development
- **shadcn/ui** - High-quality UI components
- **Tailwind CSS** - Utility-first CSS framework

### Package Management
- **pnpm** - Fast, disk space efficient package manager

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **pnpm** (v8 or higher) - Install via `npm install -g pnpm`
- **PostgreSQL** (v12 or higher) - Running database instance
- **Git** - For version control

## Project Structure

```
calibrax/
├── backend/                 # Express API server
│   ├── src/
│   │   ├── db/             # Database schema and client
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Utility functions
│   │   └── validation/      # Zod validation schemas
│   ├── drizzle/             # Database migrations
│   └── drizzle.config.ts    # Drizzle Kit configuration
│
├── frontend/                # Next.js application
│   ├── app/
│   │   ├── analysis/        # Analysis pages
│   │   │   ├── overpriced/  # Overpriced products page
│   │   │   └── patterns/    # Pricing patterns page
│   │   └── components/      # Reusable components
│   └── components/ui/       # shadcn/ui components
│
└── parser/                  # CSV parsing utilities
```

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd calibrax
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
pnpm install

# Create environment file
cp .env.example .env
```

The `.env.example` file includes a default `DATABASE_URL` that works with the Docker setup below.

### 3. Database Setup

**Option A: Using Docker (Recommended for Development)**

The easiest way to get started is using Docker Compose:

```bash
cd backend

# Start PostgreSQL container
docker-compose up -d

# Verify it's running
docker-compose ps
```

This will start a PostgreSQL 16 container with:
- Database: `calibrax`
- User: `calibrax`
- Password: `calibrax`
- Port: `5432`

The connection string is already configured in `.env.example`.

**Option B: Using Local PostgreSQL**

If you prefer to use a local PostgreSQL installation:

```bash
# Create database
createdb calibrax
# Or using psql:
# psql -U postgres
# CREATE DATABASE calibrax;
```

Update `.env` with your database connection:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/calibrax
```

**Initialize the database schema:**

```bash
# Option 1: Push schema directly (development)
pnpm db:push

# Option 2: Generate and run migrations (recommended)
pnpm db:generate
pnpm db:migrate
```

For more details on database migrations, see [backend/MIGRATIONS.md](./backend/MIGRATIONS.md).

### 4. Frontend Setup

```bash
cd ../frontend

# Install dependencies
pnpm install

# Create environment file (optional, defaults to localhost:4000)
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local
```

## Running the Project

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
pnpm dev
```

The backend API will be available at `http://localhost:4000`

**Terminal 2 - Frontend:**
```bash
cd frontend
pnpm dev
```

The frontend will be available at `http://localhost:3000`

### Production Build

**Backend:**
```bash
cd backend
pnpm build
pnpm start
```

**Frontend:**
```bash
cd frontend
pnpm build
pnpm start
```

## API Endpoints

### Health Check
- `GET /api/health` - Server health status

### Products
- `GET /api/products` - List internal products (paginated)
  - Query params: `page`, `limit`, `vendor`, `search`

### Competitors
- `GET /api/competitors/products` - List competitor products (paginated)
  - Query params: `page`, `limit`, `competitorVendor`

### Analysis
- `GET /api/analysis/overpriced` - Get overpriced products analysis
  - Query params: `page`, `limit`, `threshold` (default: 1.1), `vendor`, `competitorVendor`
  
- `GET /api/analysis/patterns` - Get pricing patterns analysis
  - Query params: `threshold` (default: 1.1), `vendor`, `competitorVendor`, `confidenceScope` ("all" | "high")

### Data Ingestion
- `POST /api/ingest/csv` - Ingest pricing data from CSV file
  - Body: `{ filePath: string }`

## Frontend Pages

### Analysis Pages

- **`/analysis/overpriced`** - Overpriced Products Analysis
  - Displays products with competitor comparisons
  - Collapsible product cards with competitor tables
  - Pagination support
  - Query params: `page`, `limit`, `threshold`

- **`/analysis/patterns`** - Pricing Patterns Analysis
  - Summary cards with key metrics
  - Competitor pricing patterns table
  - Vendor overpricing patterns table
  - Query params: `threshold`, `vendor`, `competitorVendor`, `confidenceScope`

## Database Schema

The database consists of four main tables:

1. **`products`** - Internal (DIY) products
2. **`competitor_products`** - Competitor product listings
3. **`product_matches`** - Product matching relationships with confidence scores
4. **`normalized_prices`** - Pre-computed normalized unit prices

For detailed schema documentation, see [DB_Schema.md](./DB_Schema.md).

## Development Workflow

### Making Schema Changes

1. Update `backend/src/db/schema.ts`
2. Generate migration: `pnpm db:generate`
3. Review generated SQL in `backend/drizzle/`
4. Apply migration: `pnpm db:migrate`
5. Commit both schema and migration files

### Adding New API Endpoints

1. Create route handler in `backend/src/routes/`
2. Add validation schema in `backend/src/validation/`
3. Implement business logic in `backend/src/services/`
4. Register route in `backend/src/app.ts`

### Adding New Frontend Pages

1. Create page component in `frontend/app/`
2. Create server action in `frontend/app/[page]/action.ts`
3. Define TypeScript types in `frontend/app/[page]/types.ts`
4. Create UI components in `frontend/app/[page]/components/`

## Key Concepts

### Price Index
```
price_index = our_price / competitor_price
```
A product is considered overpriced if `price_index > threshold` (default: 1.1).

### Confidence Levels
- **High**: `exactMatch === true` AND `matchingScore >= 0.8`
- **Medium**: `matchingScore >= 0.6`
- **Low**: All other matches

### Unit Price Normalization
The system automatically normalizes prices to per-unit values, handling:
- Weight-based units (g, kg, oz, lb)
- Volume-based units (ml, l, fl oz)
- Count-based units (pcs, units)
- Item-based pricing (no unit)

## Documentation

- [Process Requirements](./PROCESS_REQUIREMENTS.md) - Project requirements and goals
- [Pricing Calculations](./PRICING_CALCULATIONS.md) - Detailed calculation logic
- [Database Migrations](./backend/MIGRATIONS.md) - Migration guide
- [Ingest Strategy](./Ingest_Strategy.md) - CSV ingestion approach

## Troubleshooting

### Database Connection Issues
- **Using Docker:** Verify container is running: `docker-compose ps`
- **Using Docker:** Check logs: `docker-compose logs postgres`
- Verify `DATABASE_URL` is correct in `backend/.env`
- Ensure PostgreSQL is running (Docker or local)
- Check database exists: `psql -l | grep calibrax` (or `docker-compose exec postgres psql -U calibrax -l`)

### Docker Issues
- **Port already in use:** Change the port mapping in `docker-compose.yml` (e.g., `"5433:5432"`)
- **Container won't start:** Check logs with `docker-compose logs postgres`
- **Reset database:** `docker-compose down -v` (⚠️ deletes all data)

### Tables Don't Exist
- Run `pnpm db:push` from the `backend/` directory
- Or run `pnpm db:generate && pnpm db:migrate`

### Frontend Can't Connect to Backend
- Verify backend is running on port 4000
- Check `NEXT_PUBLIC_API_URL` in `frontend/.env.local`
- Default is `http://localhost:4000`

### Port Already in Use
- Backend: Change `PORT` in `backend/.env`
- Frontend: Change port with `pnpm dev -- -p 3001`

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests (if available)
4. Submit a pull request

## License

[Add your license here]

## Support

For questions or issues, please [open an issue](link-to-issues) or contact the development team.
