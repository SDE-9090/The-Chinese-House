# Henny's Gourmet Waffles - Backend API

Express.js + PostgreSQL backend for the ordering system.

## Quick Start

```bash
cd backend
npm install

# 1. Create a PostgreSQL database
createdb hennys_db

# 2. Copy and edit environment variables
cp .env.example .env
# Edit .env with your database URL and dashboard password

# 3. Initialize the database
npm run db:init

# 4. Start the server
npm run dev
```

## API Endpoints

### Public
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/orders` | Place a new order |
| GET | `/api/orders/tokens` | Get today's token statuses |

### Dashboard (requires `x-dashboard-password` header)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/orders` | Today's orders |
| GET | `/api/dashboard/orders/all` | All orders (last 500) |
| PATCH | `/api/dashboard/orders/:id/status` | Update order status |
| PATCH | `/api/dashboard/orders/:id/payment` | Update payment status |
| GET | `/api/dashboard/stats` | Dashboard statistics |

## Frontend Integration

Set `VITE_API_URL` in your frontend `.env`:
```
VITE_API_URL=http://localhost:4000/api
```

The frontend automatically uses the API when `VITE_API_URL` is set, otherwise falls back to localStorage.
