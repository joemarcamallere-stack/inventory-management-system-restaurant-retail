# CLAUDE.md

Inventory Management System for **Retail** and **Restaurant** businesses. One codebase, two
business modules, multi-tenant.

## Stack & layout

- **backend/** — NestJS + Prisma, **PostgreSQL**. REST API under `/api`.
- **frontend/** — React + Vite + TypeScript, TanStack Query, Tailwind.
- Single backend serves both modules; the frontend has parallel UI trees per module.

## Running

```bash
# backend (local DB from backend/.env) — runs prisma migrate deploy + generate first
cd backend && npm run dev            # http://localhost:3000

# backend against the CLOUD DB (backend/.env.cloud)
cd backend && npm run dev:cloud

# frontend
cd frontend && npm run dev           # Vite; proxies /api -> http://localhost:3000

# checks
cd frontend && npm run typecheck     # tsc --noEmit
cd backend && npm test               # jest
```

Prisma: migrations in `backend/prisma/migrations`, seed via `npm run prisma:seed` (`prisma/seed.ts`).

> ⚠️ **Local vs cloud DB.** `backend/.env` points at a local `inventory_db`; `backend/.env.cloud`
> points at the deployed database. The app you interact with in the browser is usually running
> `dev:cloud`, so the **local DB does not reflect what the UI shows**. Before concluding "data is
> missing" or seeding, confirm *which* database the running backend uses. Don't read secrets out of
> `.env.cloud` unless asked.

## Multi-tenancy model (read this first)

Every domain row is scoped by **`businessId`** (the tenant) **and** **`module`** (`RETAIL` |
`RESTAURANT`). The backend derives both from the JWT (`businessId`, `role`) and the request module,
and filters every query by them. Consequences:

- A user only ever sees their own business's data. An "empty" page usually means *that business has
  no rows*, not a bug. (One business's seeded items are invisible to another business's login.)
- A `Business` has a `modules: BusinessModule[]` array; some tenants are retail-only, some are both.
- Roles: `Admin`, `Manager`, `Staff` (+ restaurant `KitchenStaff`). Approvals/QC are role-gated.

## End-to-end flow (the spine of the system)

**Procurement → Receiving (QC gate) → Inventory → Sales**, with audit trails. Inventory is never
written directly by procurement — only via QC-gated receiving, sales, transfers, and explicit
adjustments, each emitting a `StockMovement`.

1. **Suppliers** — directory, scoped per business+module.
2. **Purchase Orders** — `DRAFT → SUBMITTED → APPROVED → (PARTIALLY_RECEIVED) → RECEIVED`, plus
   `REJECTED` / `CANCELLED`. Staff create & submit; Admin/Manager approve/reject. Retail POs
   support two line types: **general merchandise** (per-unit, SKU, cost+retail price, reorder point)
   and **thrift/ukay bales** (bale type, weight, condition/grade). New PO lines auto-create
   zero-stock `InventoryItem`s so they can be classified before receipt.
3. **Goods Receipt / Products Received** — approved POs queue for a **quality check**. Inspector sets
   accepted vs rejected qty per line; **only the accepted qty is added to stock**, rejected is held
   back for return/refund. Records condition/notes; writes a `GoodsReceipt` + `StockMovement`.
   Costing uses weighted average on receipt.
4. **Inventory** — source of truth. Retail browses it as **category tabs → subcategory folders**.
5. **Stock Alerts** — reorder thresholds; feeds back into new POs.
6. **Outbound** — POS (sell) → Sales History; Transfers between locations; Item Bundling (retail);
   Adjustments. Restaurant adds Recipes/BOM and Kitchen Orders that consume ingredients.

## Backend modules (shared — NOT duplicated)

`auth, users, businesses, locations, categories, suppliers, inventory, stock-movements,
purchase-orders, transfers, sales, bundles, adjustments, notifications`
Restaurant-only: `recipes, kitchen-orders, dining-tables, restaurant-settings`.
The shared modules take a `module` param/scope rather than having retail/restaurant copies. Good.

## Frontend duplication map (the main tech-debt)

The **backend is consolidated; the frontend is not.** Retail and restaurant reimplement the same
flows as separate components (and have *diverged* — e.g. a receiving QC bug existed only in retail).

| Flow | Retail (`modules/retail`) | Restaurant (`modules/restaurant`) | Notes |
|---|---|---|---|
| Purchase Orders | `PurchaseOrdersView.tsx` (~1100) | `PurchaseOrders.tsx` (~1658) + `PurchaseOrderItemInput.tsx` | Same backend, separate UIs |
| Goods receiving / QC | `ProductsReceivedView.tsx` (~551) | `GoodsReceived.tsx` (~1125) | Same `receive` endpoint, different inspection fields |
| Inventory | `InventoryView.tsx` (~592) | `Inventory.tsx` (~764) | |
| Product master data | `ProductManagementView.tsx` | `ProductManagement.tsx` / `AddProduct.tsx` | |
| Transfers | `TransfersView.tsx` (~568) | `Transfers.tsx` (~1307) | |
| Reports | `ReportsView.tsx` (~1436) | `Reports.tsx` (~1152) | |
| Multi-location | `MultilocationView.tsx` | `MultiLocation.tsx` | |
| User management | `UserManagementView.tsx` | `UserManagement.tsx` | |
| POS | `POSView.tsx` | `POSKitchenOrders.tsx` | |
| Dashboard / Stock | `DashboardView`, `StockAlertsView` | `Dashboard`, `StockControl` | |

Retail-only: `ItemBundlingView`. Restaurant-only: `RecipeBOM`, kitchen, `CategorySelection/Detail`.

**Data layer is mostly shared already:** `modules/lib/domainQueries.ts` is the base; per-module
`lib/{retail,restaurant}/*` are thin wrappers that tag the module and map API → view models. The
wrappers themselves are near-identical (`shared.ts`, `inventoryQueries.ts`, …) and are the easy win.

### Already consolidated (config-driven shared components)
- **Receiving / Goods Received** → `modules/shared/receiving/GoodsReceived.tsx`, driven by
  `retail/receivingConfig.tsx` and `restaurant/receivingConfig.tsx`. Both module screens
  (`ProductsReceivedView`, restaurant `GoodsReceived`) are now thin wrappers. The QC accepted-only-
  to-stock logic lives in one `buildReceiveItem`/submit path.
- **Suppliers directory + add form** → `modules/shared/suppliers/SuppliersManager.tsx`, used by both
  Purchase Order screens. Each passes normalized suppliers + a create callback + field defs.

Pattern for both: one shared skeleton owns the UI/logic; each module supplies a small **config**
(data hooks, field defs, `build*`/validate transforms, labels). Bespoke bits use a render-prop
escape hatch (e.g. the restaurant QC score grid). Tenant isolation is unaffected — each config still
calls its own module-scoped query/mutation hooks.

> **PO screens are intentionally NOT fully merged.** Their create/list flows genuinely diverge
> (status vocabulary uppercase enum vs lowercase; retail two-product-type + inventory creation vs
> restaurant global-product autocomplete + edit + CSV export; cards vs table). Only the shared
> Suppliers piece was extracted; forcing a full merge would be over-engineering.

### Divergences that cause bugs
- **Styling:** retail hardcodes hex (`#007A5E`); restaurant uses theme tokens (`text-foreground`,
  `bg-card`). Pick one (the restaurant token system is better).
- **UX primitives:** restaurant uses `sonner` toasts; retail uses `alert()` + inline error state.
- **Behavior drift:** the same conceptual flow is maintained twice, so fixes land in one side only.

## Suggested consolidation (highest value first)

1. ~~**Unify receiving**~~ ✅ done — `shared/receiving/GoodsReceived.tsx`.
2. ~~**Shared Suppliers manager**~~ ✅ done — `shared/suppliers/SuppliersManager.tsx`, used by both PO
   screens. (Full PO merge intentionally skipped — see note above.)
3. **Collapse the lib wrappers** into the shared `domainQueries` layer parameterized by `module`,
   leaving only genuinely module-specific mappers.
4. **Standardize UI primitives**: one theme token system, `sonner` everywhere, shared status-badge /
   modal / table components.
5. Apply the same config-driven treatment to the remaining amenable pairs (Transfers, Inventory,
   Product Management) where the flows are similar enough to be worth it.

## Gotchas

- Multi-tenant scoping + cloud/local DB split are the two things most likely to make something look
  "broken" when it's just data/account state. Verify the logged-in `businessId` and the active DB.
- Retail category taxonomy lives in `frontend/src/app/utils/constants.ts`
  (`categorySubcategories` = apparel/thrift; `generalMerchandiseSubcategories` = general retail).
- Prisma 7 uses a driver adapter (`PrismaPg`); ad-hoc scripts must construct the client with the
  adapter, not bare `new PrismaClient()`.
