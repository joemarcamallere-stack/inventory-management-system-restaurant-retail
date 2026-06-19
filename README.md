# Inventory Management System

A multi-tenant inventory and POS platform covering two business verticals — **Retail** and **Restaurant** — sharing a common backend domain (inventory, stock movements, purchase orders, transfers, users/locations).

Originally bootstrapped from a Figma prototype (https://www.figma.com/design/A67FuBcL3WCKKQI8CdKppv/Inventory-Management-Prototype), now built out into a full NestJS + Prisma backend and a React + Vite frontend.

## Architecture

- **Monorepo** (npm workspaces): `frontend/` and `backend/`.
- **Backend** — NestJS modular monolith, one module per domain (`inventory`, `sales`, `purchase-orders`, `transfers`, `recipes`, `kitchen-orders`, `bundles`, `adjustments`, etc.), backed by **Prisma ORM** over PostgreSQL. Auth is JWT-based with role (`roles.guard`) and business-module (`business-modules.guard`) access control.
- **Frontend** — React + Vite SPA. `app/` holds the shell (routing, session, API client); `modules/restaurant/` and `modules/retail/` hold the per-vertical screens, switched at runtime based on the logged-in user's licensed modules.

## POS migration

POS is integrated into this IMS app, not deployed as a separate Bukolabs runtime. IMS owns the backend, Prisma schema, auth/session model, API contracts, stock ledger, reports, and app shell. Bukolabs-POS remains a workflow/UI reference only.

The POS frontend now has dedicated module workspaces:

- Restaurant POS: `restaurant-pos-dashboard`, `restaurant-create-order`, `restaurant-payment`, `restaurant-receipt`, `restaurant-order-list`, `restaurant-kitchen-queue`, table management, reports, and settings.
- Retail POS: `pos-dashboard`, `retail-create-order`, `retail-order-list`, `retail-thermal-receipt`, reports, and settings.

The production transaction path is:

```txt
POSOrder -> Payment -> Receipt -> Sale -> StockMovement
```

Restaurant orders also connect to dining tables and POS-linked kitchen tickets. Store and receipt settings are stored through neutral `BusinessSetting` and `POSSetting` models. SuperAdmin is intentionally deferred until the cross-business tenancy model is discussed and approved.

## Running the code

### Prerequisites
- Node.js >= 20
- A PostgreSQL database

### Setup

```bash
npm i
```

Copy the backend env file and fill in your database credentials:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/inventory_db?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
PORT=3000
NODE_ENV="development"
```

### Development

```bash
npm run dev:backend   # NestJS API on http://localhost:3000 (runs Prisma migrate + generate first)
npm run dev:frontend  # Vite dev server on http://localhost:5173
```

### Build

```bash
npm run build:backend
npm run build:frontend
```
