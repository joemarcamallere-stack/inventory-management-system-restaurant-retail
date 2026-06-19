# POS Migration Plan

Migrating the POS experience from **Bukolabs-POS** (`https://github.com/Lmaw-dev/Bukolabs-POS`) into this **Inventory Management System** monorepo.

> Audience: an automated agent (Codex) or a developer executing the migration step by step. Every task names concrete files, endpoints, and acceptance criteria. Do the phases in order; do not skip the verification gate at the end of each phase.

---

## 0. Guiding decisions (already settled — do not re-litigate)

1. **Backend wins here.** This repo's NestJS + Prisma backend is the system of record. Bukolabs-POS's `pg`/raw-SQL/Supabase backend is **discarded**. SuperAdmin remains a future tenancy discussion, not part of this migration pass.
2. **Frontend is a transplant, not a copy.** Bukolabs-POS's POS *screens and flow logic* are ported into this repo's `frontend/src/modules/{restaurant,retail}/`, **rewritten against this repo's typed API client** (`frontend/src/app/api/client.ts`), not its raw `fetch`/Supabase calls.
3. **One database, one schema.** Prisma stays. No Supabase, no hand-written SQL migration scripts. Bukolabs `store_information` maps into neutral `BusinessSetting` and `POSSetting` records.
4. **One UI system.** This repo's `frontend/src/app/components/ui` is the component library. The Figma-exported MUI+Radix kit in Bukolabs (`@figma/my-make-file`) is a **visual reference only** — do not add MUI as a dependency.
5. **Work happens on a branch** `pos-integration`, merged to `main` via PR.

---

## 1. Architecture reference (what already exists here)

### Backend (`backend/src`, NestJS + Prisma)
- 19 feature modules registered in `backend/src/app.module.ts`.
- Tenancy root is `Business` (`backend/prisma/schema.prisma`): every domain row carries `businessId`; `Business.modules: BusinessModule[]` (`RETAIL`, `RESTAURANT`) gates the UI.
- Auth/authz: `jwt-auth.guard.ts`, `roles.guard.ts`, `business-modules.guard.ts`. Auth is **HttpOnly-cookie based** (see client note below).

### POS-relevant models already in `backend/prisma/schema.prisma`
| Model | Purpose | Key fields |
|---|---|---|
| `Sale` | Transaction header | `transactionNumber`, `locationId`, `cashierId?`, `subtotal`, `discount`, `tax`, `total`, `paymentMethod`, `amountPaid`, `change`, `customer?`, `status` (`SaleStatus`), `refundReason?`, `businessId`, `module` |
| `SaleItem` | Line item | `saleId`, `inventoryItemId`, `name`, `quantity`, `unitPrice`, `totalPrice` |
| `KitchenOrder` | Restaurant order ticket, optionally linked 1:1 to a `Sale` | `receiptNo`, `quantity`, `status` (`KitchenOrderStatus`), `notes?`, `recipeId`, `locationId?`, `tableId?`, `saleId? @unique`, `businessId`, `completedById?` |
| `DiningTable` | Table | `tableNumber`, `capacity`, `status` (`DiningTableStatus`), `floor?`, `notes?`, `locationId`, `businessId`, unique `(businessId, locationId, tableNumber)` |
| `RestaurantSetting` | Generic settings store (receipt text, tax rate, currency...) | `key`, `value` (JSON), `businessId`, unique `(businessId, key)` |

### Existing backend endpoints (verified in controllers)
| Resource | Routes |
|---|---|
| Sales (`sales.controller.ts`) | `POST /` create · `GET /` list · `GET /:id` · `PATCH /:id/refund` |
| Kitchen Orders (`kitchen-orders.controller.ts`) | `POST /` · `GET /` · `GET /:id` · `PATCH /:id/void` · `PATCH /:id/status` |
| Dining Tables (`dining-tables.controller.ts`) | `POST /` · `GET /` · `GET /:id` · `PATCH /:id/status` · `DELETE /:id` |
| Restaurant Settings (`restaurant-settings.controller.ts`) | `GET /` · `PUT /:key` |

> Resolve each controller's route prefix from its `@Controller('...')` decorator and combine with the global `/api` prefix used by the client (paths in `client.ts` look like `/api/auth/login`).

### Frontend (`frontend/src`, React + Vite)
- **Shell** `app/`: `App.tsx` (root), `api/client.ts` (typed API client — **cookie auth, no token header**), `api/domainTypes.ts` (the `Api*` types), `hooks/useSession.ts`, `hooks/useViewNavigation.ts`, `queryClient.ts` (TanStack Query).
- **Navigation is NOT react-router.** It is a custom enum-based router: `useViewNavigation()` returns `currentView: ViewType` + `navigateToView()`. `App.tsx` lazy-loads each view and renders by `activeModule` (`'RETAIL' | 'RESTAURANT'`, derived from `currentUser.modules`). **New POS screens must be registered as `ViewType`s and lazy-loaded in `App.tsx`** — not added as routes.
- **Module screens** live in `modules/retail/*` and `modules/restaurant/*`. Data hooks live in `modules/lib/{retail,restaurant}` (e.g. `useRetailInventoryQuery`).
- **UI kit**: `app/components/ui` (shadcn-style).

---

## 2. Source inventory (what Bukolabs-POS brings)

Clone for reference into a scratch dir **outside the repo** (do not commit it):
```bash
git clone --depth 1 https://github.com/Lmaw-dev/Bukolabs-POS.git /tmp/bukolabs-src
```

### Screens worth porting (by line count — the big ones hold the real logic)
| Bukolabs file | Lines | Target vertical |
|---|---|---|
| `frontend/src/restaurant/pages/CreateOrder.tsx` | 2912 | restaurant |
| `frontend/src/restaurant/pages/TableManagement.tsx` | 1171 | restaurant |
| `frontend/src/restaurant/pages/OrderList.tsx` | 967 | restaurant |
| `frontend/src/restaurant/pages/Reports.tsx` | 590 | restaurant |
| `frontend/src/restaurant/pages/POSDashboard.tsx` | 489 | restaurant |
| `frontend/src/restaurant/pages/Payment.tsx` | 203 | restaurant |
| `frontend/src/restaurant/pages/KitchenQueue.tsx` | 143 | restaurant |
| `frontend/src/restaurant/pages/Receipt.tsx` | 74 | restaurant |
| `frontend/src/retail/pages/RetailCreateOrder.tsx` | 1429 | retail |
| `frontend/src/retail/pages/RetailOrderList.tsx` | 777 | retail |
| `frontend/src/retail/pages/RetailReports.tsx` | 591 | retail |
| `frontend/src/retail/pages/RetailPOSDashboard.tsx` | 430 | retail |
| `frontend/src/retail/pages/RetailThermalReceipt.tsx` | 304 | retail |
| `frontend/src/retail/pages/RetailDashboard.tsx` | 118 | retail |

### Shared logic to port (rewire, don't copy wholesale)
- Context providers: `RetailOrderContext.tsx`, `shared/context/{OrderContext,StoreSettingsContext,TableContext}.tsx` → replace with TanStack Query + local cart state hooks.
- Utilities worth keeping: `shared/utils/{vat.ts,date.ts}` (verify VAT math matches `Sale.tax` semantics before reuse).
- Receipt rendering (`ThermalReceipt.tsx`, `RetailThermalReceipt.tsx`) — keep markup, swap data source to `Sale`/`SaleItem` + `RestaurantSetting` receipt keys.

### Explicitly discard
- All of `backend/` from Bukolabs.
- All `*.sql` and `scripts/*.js` from Bukolabs.
- `@figma/my-make-file` frontend `package.json`, its MUI deps, and the duplicate `shared/components/ui` kit (reference visuals only).

> **Deferred:** the `superadmin` concept is not part of this migration pass. Its backend logic is still discarded (raw `pg`), and any future SuperAdmin work must first resolve cross-business tenancy.

---

## 3. Phase plan

Each phase ends with a **Gate** — do not proceed until it passes.

### Phase 0 — Branch & scaffolding
1. `git checkout -b pos-integration` (working tree is clean on `main`).
2. Create scratch clone of Bukolabs-POS (Section 2). Confirm it is **not** under the repo working tree and is git-ignored / external.
3. Add a tracking checklist file `docs/pos-migration-checklist.md` mirroring the tasks below (optional but recommended for resumability).

**Gate 0:** `npm i` succeeds at repo root; `npm run dev:backend` and `npm run dev:frontend` both start cleanly on the new branch.

---

### Phase 1 — Backend gap analysis (read-only)
Goal: prove the existing API can serve every Bukolabs POS screen **before** touching the frontend. Produce findings in `docs/pos-migration-checklist.md`.

For each Bukolabs screen, list the data it reads/writes, then map to an existing endpoint from Section 1. Flag gaps. Known areas to verify:

1. **Checkout / order creation.** Does `POST /api/sales` accept line items + payment in one call, and does it (a) decrement `InventoryItem` stock via `StockMovement`, and (b) for restaurant, create the linked `KitchenOrder` — or is a second `POST /api/kitchen-orders` required? Inspect `sales.service.ts` create logic.
2. **Table-driven dine-in.** Can a `KitchenOrder` be created with `tableId` and move a `DiningTable.status` (`PATCH /api/dining-tables/:id/status`) in the same flow? Confirm `DiningTableStatus` enum values cover Bukolabs states (available/occupied/reserved/etc.).
3. **Kitchen queue transitions.** Do `KitchenOrderStatus` values cover Bukolabs' queue stages (e.g. pending → preparing → ready → served/completed)? `PATCH /api/kitchen-orders/:id/status`.
4. **Store/receipt settings.** Map Bukolabs `store_information` columns (business_name, address, contact, logo, receipt_thank_you_message, receipt_footer_message, currency, tax_rate, service_charge_rate, theme_color, operating_hours) to neutral `BusinessSetting` and `POSSetting` keys.
5. **Reports.** Reporting is **server-side (decided)** — do not compute from a full `GET /api/sales` pull on the client. Here, only *enumerate the report requirements* that `Reports.tsx` / `RetailReports.tsx` display (which metrics, which groupings, which filters) so Phase 2 can build the aggregation endpoints. Capture: metrics (gross/net sales, transaction count, average ticket, items sold, refunds/voids totals), groupings (by day/week/month, by item, by category, by cashier, by location, by payment method), and filters (date range, location, module RETAIL/RESTAURANT, cashier, status). See Phase 2 task for the endpoint contract.

**Output:** a gap table — `screen | data needed | existing endpoint | gap (none / new field / new endpoint)`.

**Gate 1:** Every screen either maps cleanly or has a written, scoped backend task. No "TBD".

---

### Phase 2 — Backend changes (only what Phase 1 flagged)
Implement each flagged gap as a normal Nest module change. Likely candidates (confirm against Phase 1):
- `RestaurantSetting` key constants + a typed accessor (so receipt/store settings have a defined schema, not arbitrary JSON).
- Service-charge handling on `Sale` if Bukolabs supports it and the model doesn't (add field via Prisma migration only if truly needed — prefer encoding in `discount`/`tax` semantics if it fits).
- Validate that create-sale is **transactional** (sale + sale items + stock movements + optional kitchen order in one Prisma `$transaction`).

#### 2-pre. Refund/void model fix (prerequisite for reporting — do before 2a)
**Current behavior (verified):** `sales.service.ts refund()` does a *full* refund only — it flips `Sale.status` `COMPLETED` → `REFUNDED`, stores `refundReason`, and restocks all items via `VOID_RESTOCK` stock movements. **It does not reverse monetary fields** (`total`/`amountPaid` stay at original values) and **there is no refund timestamp on `Sale`** — the only durable record of *when* a refund happened is the `VOID_RESTOCK` `StockMovement.createdAt`. `SaleStatus.PARTIAL_REFUND` exists in the enum but is **not implemented**. Kitchen-order void (`kitchen-orders.service.ts void()`) is separate, sets `voidedAt`, and does **not** refund the linked sale.

Because the refund mutates the original row in place with no timestamp, the system today implicitly attributes refunds to the **original sale date**. For production financials we want the opposite.

**Decided policy: refund-date attribution.** A refund reduces revenue in the period the refund occurred, not the period of the original sale. This requires a small schema change *before* building the reporting queries:

1. **Schema:** add `refundedAt DateTime?` (and, for restaurant parity, confirm `voidedAt` already exists on `KitchenOrder` — it does) to `Sale` in `backend/prisma/schema.prisma`; Prisma migration.
2. **Service:** set `refundedAt = new Date()` inside `refund()` when flipping to `REFUNDED`. Optionally also set `refundedById` for auditability (a `User` relation) if not already captured.
3. **Backfill:** for existing `REFUNDED` rows, backfill `refundedAt` from the corresponding `VOID_RESTOCK` `StockMovement.createdAt` (one-off migration/seed step). If none exists, fall back to `updatedAt`.
4. **PARTIAL_REFUND:** leave unimplemented for now, but reporting must treat the enum value as a known case (do not assume only `COMPLETED`/`REFUNDED` exist). If partial refunds are later implemented, they will need a separate refund-amount ledger — out of scope for this migration; note it as future work.
5. **Restaurant void vs. sale refund:** keep them decoupled, but document for Reports which signal is authoritative per metric — sales figures key off `Sale.status`/`refundedAt`; ingredient/stock figures key off the `StockMovement` ledger; kitchen throughput keys off `KitchenOrder.status`/`voidedAt`.

**Gate 2-pre:** migration applied; `refund()` sets `refundedAt`; existing refunded rows backfilled; unit test asserts `refundedAt` is set on refund and a refunded sale's original `total` is unchanged.

#### 2a. Server-side reporting (definite — production requirement)
Reporting must be computed in the database, not by pulling all sales to the client. Client-side aggregation is acceptable only for prototypes; it degrades once there are large transaction volumes, date ranges, multiple locations, refunds/voids, payment methods, cashier filters, and the RETAIL/RESTAURANT module split. Build a dedicated reporting surface:

- **New module** `backend/src/reports/` (controller + service + DTOs), guarded by `jwt-auth.guard` + `roles.guard` (manager/admin/superadmin) + `business-modules.guard`. All queries are scoped by `businessId`.
- **Endpoints** (final names to confirm in implementation; suggested):
  - `GET /api/reports/sales-summary` — top-line totals for a period: gross sales, discounts, tax, net sales, transaction count, average ticket, total refunds, total voids. Honors all filters below.
  - `GET /api/reports/sales-by-period?granularity=day|week|month` — time series for charts.
  - `GET /api/reports/sales-by-item` and `GET /api/reports/sales-by-category` — product performance (qty sold, revenue), supports top-N + sort.
  - `GET /api/reports/sales-by-cashier` — per-cashier totals and counts.
  - `GET /api/reports/sales-by-payment-method` — split by `paymentMethod`.
  - `GET /api/reports/sales-by-location` — per-`Location` totals (multi-location).
- **Common query params** on every endpoint: `from`, `to` (ISO date range, required or sensible default), `locationId?`, `module?` (`RETAIL`|`RESTAURANT`), `cashierId?`, `status?`. Validate with `class-validator` DTOs; reject unbounded/huge ranges or cap them.
- **Correctness rules:**
  - Aggregate in SQL via Prisma `groupBy`/`aggregate` (or `$queryRaw` for grouped time buckets) — never load all rows into Node to sum them.
  - **Refund attribution is refund-date (decided, see 2-pre).** A refund reduces revenue in the period it *occurred* (`Sale.refundedAt`), not the original sale period (`createdAt`). Concretely:
    - **Gross sales** for a period = sum of `total` for sales whose `createdAt` falls in the period (count the sale where/when it was rung up). Do **not** silently drop refunded rows by status alone — that would mis-attribute to sale date.
    - **Refunds** for a period = sum of refunded `total` for sales whose `refundedAt` falls in the period.
    - **Net sales** = gross sales (by `createdAt`) − refunds (by `refundedAt`). These two legs use *different* date columns; build them as separate aggregates over the same range and combine.
    - Treat `SaleStatus.PARTIAL_REFUND` as a known case (currently unimplemented) — do not write queries that assume only `COMPLETED`/`REFUNDED` exist.
  - **Voids:** voided `KitchenOrder`s (`status = VOIDED`, `voidedAt`) affect kitchen-throughput and ingredient-stock metrics, not sale revenue (sale revenue is governed by `Sale` refunds). Report them on their own lines; do not double-count against sales totals.
  - Respect `module` separation so retail and restaurant reports never bleed together unless explicitly combined.
  - Add indexes if needed to keep period+location+status queries fast (e.g. on `Sale(businessId, createdAt, status)`, `Sale(businessId, refundedAt)` for the refund leg, and `Sale(businessId, locationId)`); add via Prisma migration.
- **Pagination/shape:** summary endpoints return a single object; breakdown endpoints return arrays (with optional `limit` for top-N). Do not reuse the generic `PagedResponse` for aggregates.
- **Tests:** unit/integration tests asserting totals, **refund-date attribution** (a sale rung up in period A but refunded in period B reduces net sales in B, not A), date-range boundaries (inclusive/exclusive), void exclusion from sale revenue, and module/location scoping.

Rules:
- Every new field is a Prisma migration (`backend/prisma/schema.prisma` + `prisma migrate`). No raw SQL scripts.
- Every new endpoint goes through `jwt-auth.guard` + appropriate `roles.guard` / `business-modules.guard`.
- Add/extend DTOs with `class-validator`.

**Gate 2:** `npm run build:backend` passes; new endpoints reachable; existing backend tests (`backend/test`) still green; add tests for new endpoints.

---

### Phase 3 — Frontend data layer (types + client + hooks)
Before porting any screen, extend the **shared client**, not per-screen fetches.
1. Extend `frontend/src/app/api/domainTypes.ts` with any new/missing `Api*` shapes (e.g. richer `ApiSale` for checkout payloads, table/queue DTOs).
2. Add client functions to `frontend/src/app/api/client.ts` for every endpoint a POS screen needs (sales create/list/refund, kitchen-order create/status/void, dining-table CRUD/status, restaurant-settings get/put). Mirror existing patterns (`request<T>(path, ...)`, `/api/...`, cookie auth — **no Authorization header**).
3. Add TanStack Query hooks under `frontend/src/modules/lib/{retail,restaurant}` (e.g. `useSalesQuery`, `useCreateSaleMutation`, `useDiningTablesQuery`, `useKitchenQueueQuery`, `useUpdateKitchenOrderStatusMutation`). Follow the existing `useRetailInventoryQuery` pattern and the conventions in `docs/frontend-query-arch-adoption-plan.md`.
4. Cart state: implement as a local hook (`useCart`) or lightweight context scoped to the POS screen — **replace** Bukolabs' `OrderContext`/`RetailOrderContext`. Do not introduce a global app-wide order context.

**Gate 3:** Type-check passes (`npm run build:frontend` or `tsc`); hooks compile and can be called from a throwaway test component hitting the running backend.

---

### Phase 4 — Screen porting (the bulk of the work)
Port in dependency order so each screen can be exercised end-to-end as it lands. Suggested order:

**Restaurant vertical**
1. `RestaurantSettings`/store info screen → backed by `RestaurantSetting` keys (needed by receipts).
2. `TableManagement` → `DiningTable` CRUD + status.
3. `CreateOrder` (the 2912-line core) → cart + `POST /api/sales` (+ kitchen order). Decompose the monolith into: menu/recipe picker, cart panel, order-type/table selector, totals. **Do not paste 2900 lines as one component** — split into a folder of subcomponents under `modules/restaurant/pos/`.
4. `Payment` → payment method + amount paid/change, completes the sale.
5. `Receipt` / `ThermalReceipt` → render from returned `Sale` + settings.
6. `KitchenQueue` → `useKitchenQueueQuery` + status transitions.
7. `OrderList` → `GET /api/sales` (+ kitchen orders), filters, refund/void actions.
8. `POSDashboard`, `Reports` → consume the Phase 2a `/api/reports/*` endpoints via dedicated query hooks; render charts/tables from the server aggregates. **Do not** fetch all sales and total them in the component.

**Retail vertical** (mirror, simpler — no tables/kitchen)
1. `RetailCreateOrder` (1429 lines) → cart + `POST /api/sales` with `module: RETAIL`. Decompose similarly under `modules/retail/pos/`.
2. `RetailThermalReceipt`, `RetailPOSDashboard`, `RetailOrderList`, `RetailDashboard`.
3. `RetailReports` → consume the Phase 2a `/api/reports/*` endpoints (with `module=RETAIL`); no client-side aggregation.

**Per-screen procedure (apply to every screen):**
- a. Recreate the JSX using this repo's `app/components/ui` components (map Bukolabs Radix/MUI usage to the local equivalent; rebuild MUI-only widgets).
- b. Replace every raw `fetch`/Supabase/context read with the Phase-3 hooks.
- c. Register the screen: add a `ViewType` entry, lazy-import it in `App.tsx`, add the sidebar nav item guarded by the correct module, and wire `navigateToView`.
- d. Remove dead Bukolabs imports (icons, sample-data generators, figma image fallbacks) — substitute repo equivalents.
- e. Keep each ported screen under a few hundred lines per file; extract subcomponents/hooks.

**Gate 4 (per screen):** screen renders under the correct module, reads/writes real data against the running backend, and a manual happy-path passes (use the `verify` skill for the checkout flow). No console errors, no `any`-typed API calls.

---

### Phase 5 — Auth and roles
1. Confirm ported screens respect `roles.guard` semantics (e.g. refund/void restricted to manager+). Hide/disable privileged actions in the UI by `currentUser.role`.
2. Remove any Bukolabs client-side auth assumptions (it returned the user from `/auth/login` JSON; this repo uses cookie session + `useSession`).
3. **SuperAdmin is deferred.** Do not add a `SuperAdmin` enum, cross-business bypass, or `modules/superadmin` screen until tenancy scope is approved separately.

**Gate 5:** Privileged actions are correctly gated for the existing role hierarchy, and a non-privileged user cannot reach refund/void paths via UI or direct view navigation.

---

### Phase 6 — Cleanup, settings, and docs
1. Delete the scratch Bukolabs clone reference; ensure nothing from it leaked into the tree (no MUI deps in `frontend/package.json`, no `*.sql` scripts, no Supabase config).
2. Seed/migrate default `BusinessSetting` and `POSSetting` values (replacing Bukolabs' `INSERT INTO store_information`) via a Prisma seed, not raw SQL.
3. Update `README.md` to list POS as a first-class capability and document the new screens/nav.
4. Update `docs/pos-migration-checklist.md` to all-green.

**Gate 6:** Full `npm run build:backend` + `npm run build:frontend` pass; lint passes; manual end-to-end for both retail and restaurant checkout works; PR opened from `pos-integration` → `main`.

---

## 4. Risks & watch-items
- **`CreateOrder.tsx` (2912 lines) and `RetailCreateOrder.tsx` (1429 lines)** hold most of the real business logic (pricing, discounts, VAT, order types, table linkage). Budget the majority of effort here. Port behavior, not structure — decompose aggressively.
- **VAT/tax & service-charge semantics** may differ between Bukolabs (`tax_rate`, `service_charge_rate` on store_information) and this repo's per-`Sale` `tax`/`discount` floats. Reconcile the math through `BusinessSetting`/`POSSetting` and write a unit test for totals.
- **Transactional integrity of checkout**: a sale must atomically write `Sale` + `SaleItem[]` + `StockMovement[]` (+ `KitchenOrder`). Verify it's a single Prisma `$transaction` or make it so. This is the highest-correctness-risk area.
- **Two UI systems**: resist pulling in MUI to save time on a stubborn screen — it permanently splits the design system. Rebuild with local `ui` components.
- **Navigation model mismatch**: Bukolabs likely uses `react-router`; this repo uses the enum `ViewType` router. Every screen must be re-registered, not route-mounted.
- **Multi-tenancy**: every write must carry/derive `businessId` and the correct `module`. Bukolabs' flat `stores` model has no equivalent scoping — do not import its assumptions.

## 4b. Full Functional Parity — Remaining Work (sequenced, not a single batch)

As of this checkpoint, Phase 4 has shipped a working but **reduced** first slice for both verticals (see `docs/pos-migration-checklist.md`): retail and restaurant checkout via `POSOrder` → `complete-payment` → `Sale`/`Payment`/`Receipt`, with table sync and kitchen-ticket automation. A direct comparison against the live source (`CreateOrder.tsx`, 2,912 lines) found real feature gaps, not just visual simplification. Full parity — the bar for being able to freeze Bukolabs-POS — requires closing these, in this order:

**Slice A — Checkout accuracy hardening (highest priority: same screens already shipped, financial/UX correctness gaps).**
- Per-item notes/customization (removed/replaced ingredients, quantity changes) — `POSCartItem.notes`/`customizations` fields already exist in `modules/shared/pos/posCart.ts`; no UI exposes them yet.
- Structured discount types (`senior`/`pwd`/`promo`/`custom`), percentage-based, with ID requirement for senior/PWD — currently a flat numeric discount only.
- Per-item order type so a single order can mix dine-in and takeout (`'Mixed'`) — currently order-level only (`DINE_IN` or `TAKEOUT` for the whole cart).
- Receipt print integration (`window.print()` equivalent) — currently a modal with no print trigger.

**Slice B — Remaining restaurant screens.**
- Dedicated `TableManagement` screen (current port only has inline table-select inside checkout; Bukolabs has full table/floor management, capacity, status transitions, queue).
- `OrderList` — restaurant order history with payment status, refund, void, receipt reprint (reprint endpoint already exists per Phase 2; needs a screen).
- `KitchenQueue` — verify against the existing `POSKitchenOrders`/kitchen-ticket automation; confirm status wording parity (`pending`/`preparing`/`ready`/`served`/`completed`) and whether a dedicated queue view (separate from the legacy `restaurant-kitchen-orders` route) is still needed.
- `Reports` (restaurant) — depends on Slice D below.

**Slice C — Remaining retail screens.**
- `RetailOrderList` parity check against existing `SalesHistoryView`/`sales-history` route — confirm refund/void/reprint actions match.
- `RetailThermalReceipt` — dedicated print-formatted receipt component (current receipt is a generic modal, not a thermal-print layout).
- `RetailReports` — depends on Slice D below.

**Slice D — Reporting screens.**
- Port `Reports`/`RetailReports` UI consuming the `/api/reports/*` endpoints (Phase 2a backend already done). Blocked until "first-launch report endpoint set" is finalized (open Phase 1 item).

**Slice E — Settings UI.**
- `StoreInformation`/`StoreSettings` equivalents wired to `BusinessSetting`/`POSSetting` (backend endpoints already exist per Phase 2). Covers receipt header/footer, tax rate, service-charge rate, enabled payment methods, refund/void/discount toggles.

**Slice F — SuperAdmin.**
- Deferred. Do not port `SuperadminDashboard.tsx` in this pass; resolve cross-business tenancy first.

**Slice G — Role-based nav/landing (cross-cutting, not Bukolabs-sourced).**
- Filter sidebar nav items and default landing view by `UserRole` (e.g. `Cashier` lands on POS with no Inventory nav; `Manager`/`Admin` sees everything). Flagged earlier in this migration's discussion, not yet tracked as a task — add now so it isn't retrofitted after every screen is wired.

**Slice H — Cleanup (final, only after A–G or descoped items are explicitly deferred).**
- Confirm no Bukolabs backend, SQL scripts, Supabase config, MUI dependency, or duplicate UI kit leaked into IMS.
- Update `README.md`.
- Final full backend/frontend builds.
- Only at this point does "freeze Bukolabs-POS" become a safe call.

**Explicitly out of scope unless requested:** anything in Bukolabs that's pure prototype cruft (e.g. `shared/archive/*.bak` files, the Figma `imports/` image assets, unused MUI components). Don't port what isn't used.

## 4c. POS Frontend Fidelity Phase (screens, workflow, layout)

**Target (stated explicitly):** keep IMS as the production backend/architecture, but make the POS frontend workflow, UI, and screen boundaries faithful to Bukolabs POS so the POS team can continue from something familiar. The IMS integration work is not discarded — it's the correct foundation. This phase is frontend-only.

**Keep, unchanged:**
- IMS backend and Prisma models (`POSOrder`, `Payment`, `Receipt`, `BusinessSetting`, `POSSetting`, reports, tables, kitchen tickets, refunds, voids).
- IMS auth/module scoping.
- IMS API client/hooks.
- Shared POS order/payment/receipt logic.
- Stock and recipe deduction through IMS transactions.

**Make more POS-faithful:**
- Separate screens where Bukolabs had separate screens (restaurant: `CreateOrder` → `Payment` → `Receipt` as distinct steps, not one screen with modals; retail mirrors this if Bukolabs separated retail checkout/payment/receipt similarly).
- More faithful layout, labels, interaction order, and screen naming.
- POS-specific components stay under `frontend/src/modules/{restaurant,retail}/pos`.

**Naming convention: `XxxView.tsx`, not literal Bukolabs filenames.** IMS already establishes this pattern pre-migration (`DashboardView.tsx`, `InventoryView.tsx`, `ReportsView.tsx` in `RetailViews.tsx`) — match the codebase's existing convention rather than introducing a second one:
- `CreateOrderView.tsx`, `PaymentView.tsx`, `ReceiptView.tsx`, `OrderListView.tsx`, `TableManagementView.tsx` (already separate — keep), `KitchenQueueView.tsx`, `ReportsView.tsx`, `SettingsView.tsx`.
- Retail mirrors the same pattern under `modules/retail/pos` for whichever of these Bukolabs separated on the retail side.
- `SettingsView.tsx` is one consolidated screen (not split into `StoreInformation`/`StoreSettings` as two screens) — confirmed intentional simplification, not an oversight.
- `POSDashboardView.tsx` (already ported) is not in this fidelity pass — confirmed out of scope here, dashboards aren't workflow-sensitive the way checkout is.

### Step 1 — Move consolidated logic into shared hooks/state

Extract the business logic currently inside `RestaurantPOSView.tsx` (cart, order-building, payment, receipt logic) into shared hooks/state under `modules/shared/pos`, decoupled from any one screen — this is what makes splitting into separate views in Step 2 mechanical rather than a rewrite.

### Step 2 — Split into POS-faithful screen boundaries

Build the `XxxView.tsx` set above as a local step-flow (internal step state within the POS module, consistent with IMS's `ViewType`/`navigateToView` pattern — no react-router needed) instead of one screen with overlay modals. Reference Bukolabs screen-by-screen for layout/labels/interaction order; wire every action to existing IMS API client/hooks — no new endpoints needed, this is presentation-layer only.

### Step 3 — Layout and spacing fidelity, IMS tokens retained

**Revised from the earlier draft:** keep IMS's existing design tokens (colors, etc.) rather than importing Bukolabs' literal hex/pixel values — lower risk, avoids token-system churn and clashing with the rest of the app. Instead, match Bukolabs' spacing, layout structure, and workflow ordering. Familiarity comes from structure and flow, not literal color-matching.

### Step 4 — Visual QA pass

Run both systems side by side (Bukolabs `npm run dev` at `C:\Users\Joemar S. Camallere\Documents\POS\Bukolabs-POS`, IMS `npm run dev:frontend`) and compare screen by screen: `CreateOrder`, `Payment`, `Receipt`, `OrderList`, `TableManagement`, `KitchenQueue`, `Reports`, `Settings`. Confirm with the user whether `StoreInformation`/`StoreSettings` consolidation and `POSDashboard` exclusion are intentional before treating any gaps as bugs.

### Step 5 — Shell and login (previously deferred, separate decision)

Not part of this phase's explicit scope but still open from earlier: login page restyle (keep IMS auth wiring) and app-shell restyle (keep IMS as app root). Revisit after Steps 1–4 land.

### Step 6 — SuperAdmin (deferred)

Unchanged — port `SuperadminDashboard` only after the cross-business tenancy-scope decision (Slice F).

### Sequencing

Do restaurant first (`CreateOrderView`/`PaymentView`/`ReceiptView` carry the most logic and risk), then `OrderListView`/`TableManagementView`/`KitchenQueueView`, then `ReportsView`/`SettingsView`, then mirror the same sequence for retail.

## 5. Definition of done
- Retail and restaurant POS checkout both work end-to-end against the Prisma backend, including receipts and stock decrement.
- No Supabase, no raw SQL scripts, no MUI dependency, no second UI kit.
- All POS screens registered in `App.tsx`, guarded by module + role.
- Builds, lints, and tests green; PR from `pos-integration` to `main` with this plan and checklist linked.
