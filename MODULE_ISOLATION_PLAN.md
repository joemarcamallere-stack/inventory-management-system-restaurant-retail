# Module Isolation Hardening — Execution Plan (for Codex)

> **Read this first.** This is a self-contained work order. Execute phases **in order**. After every task, run the verification for that task. Do **not** start a later phase until the current one builds green. Ask nothing; the decisions are already made and recorded here.

---

## 0. Context you need

This is an Inventory Management System with two business modules: **RETAIL** and **RESTAURANT**. A single `Business` may have one or both (see `AuthenticatedUser.modules: string[]`). Operational records (`Supplier`, `PurchaseOrder`, `GoodsReceipt`, `Transfer`, `StockMovement`, `Sale`) carry a `module: BusinessModule` column so the two modules' data stay isolated within one business.

- **Backend:** NestJS + Prisma (PostgreSQL). Prisma client v7 — **enums are emitted as `as const` objects**, so `BusinessModule.RETAIL` has the *literal* type `"RETAIL"`. Any parameter defaulted to it **must** be explicitly annotated `module: BusinessModule`, or TS narrows it and rejects `"RESTAURANT"`.
- **Frontend:** React + Vite + TanStack Query. Three-tier data layer: `app/api/client.ts` (raw HTTP) → `modules/lib/domainQueries.ts` (shared base hooks) → `modules/lib/retail/*` & `modules/lib/restaurantQueries.ts` (module façades). **Views must import only from the façades.**
- `BusinessModule` is imported from `@prisma/client` in the backend and from `app/api/domainTypes.ts` in the frontend.

### Build / verify commands (run from repo root unless noted)
```bash
# Backend typecheck + build
cd backend && npx nest build            # must exit 0, "Found 0 errors"
# Frontend typecheck + build
cd frontend && npx tsc --noEmit && npx vite build
# DB is local Postgres; connection in backend/.env (DATABASE_URL=...localhost:5432/inventory_db)
cd backend && npx prisma migrate status # read-only
cd backend && npx prisma migrate deploy # apply pending
cd backend && npx prisma generate
cd backend && npx prisma db seed
```
The current tree **builds green**. Keep it that way after each task.

---

## PHASE A — Correctness bugs (do first; small, isolated)

### Task A1 — Stamp `module` on kitchen-order stock movements 🔴

**Problem:** Kitchen-order stock movements omit `module`, so the DB default (`RETAIL`) misclassifies restaurant movements; they disappear from restaurant stock history.

**File:** `backend/src/kitchen-orders/kitchen-orders.service.ts`

1. **Fix the import.** It currently imports:
   ```ts
   import { KitchenOrderStatus, Prisma } from '@prisma/client';
   ```
   Change to:
   ```ts
   import { BusinessModule, KitchenOrderStatus, Prisma } from '@prisma/client';
   ```

2. **`VOID_RESTOCK` movement (~line 249).** In the `tx.stockMovement.create({ data: { ... } })` block whose `type: 'VOID_RESTOCK'`, add a `module` field alongside `businessId`:
   ```ts
   businessId,
   module: BusinessModule.RESTAURANT,
   ```

3. **`RECIPE_CONSUMPTION` movement (~line 376).** Same edit in the `type: 'RECIPE_CONSUMPTION'` create block:
   ```ts
   businessId,
   module: BusinessModule.RESTAURANT,
   ```

> Kitchen orders are restaurant-only, so `RESTAURANT` is unconditionally correct here.

**Verify:** `cd backend && npx nest build` exits 0. Optionally, after seeding, complete/void a kitchen order and confirm the movement appears in a `module='RESTAURANT'` stock-movements query and not in `module='RETAIL'`.

---

### Task A2 — Wire `Sale.module` (assign on create, filter on read) 🔴

**Problem:** `Sale.module` exists in the schema but is never set on create nor filtered on read, so retail and restaurant sales leak across module boundaries.

**Derivation rule (decided):** A sale is **RESTAURANT** iff it is tied to a kitchen order. `CreateSaleDto` already has `kitchenOrderId?: string`. So:
```ts
const module = dto.kitchenOrderId ? BusinessModule.RESTAURANT : BusinessModule.RETAIL;
```
This matches the migration backfill (`Sale.module = RESTAURANT WHERE a KitchenOrder links to it`).

**File:** `backend/src/sales/sales.service.ts`

1. **Import** `BusinessModule`:
   ```ts
   import { BusinessModule, Prisma } from '@prisma/client';
   ```

2. **`create()`** — compute `module` (near `transactionNumber`, ~line 50) and add it to `tx.sale.create({ data: { ... } })` (~line 67, next to `businessId`):
   ```ts
   const module = dto.kitchenOrderId ? BusinessModule.RESTAURANT : BusinessModule.RETAIL;
   ...
   data: {
     ...
     businessId,
     module,
     ...
   }
   ```

3. **`findAll()`** (~line 140) — add a `module` parameter and filter on it:
   ```ts
   async findAll(
     businessId: string,
     module: BusinessModule = BusinessModule.RETAIL,   // explicit annotation (Prisma v7)
     locationId?: string,
     status?: string,
     dateFrom?: string,
     dateTo?: string,
     page = 1,
     limit = 50,
   ): Promise<PaginatedResult<any>> {
     const where: Prisma.SaleWhereInput = {
       businessId,
       module,
       ...(locationId ? { locationId } : {}),
       ...
     };
   ```

**File:** `backend/src/sales/sales.controller.ts`

4. **`findAll` endpoint** — accept `@Query('module') module?: BusinessModule` and pass `module ?? BusinessModule.RETAIL` (import `BusinessModule` from `@prisma/client`). **Insert `module` as the FIRST argument after `businessId`**, matching the new service signature order:
   ```ts
   return this.salesService.findAll(
     user.businessId,
     module ?? BusinessModule.RETAIL,
     locationId, status, dateFrom, dateTo,
     page ? parseInt(page, 10) : 1,
     limit ? parseInt(limit, 10) : 50,
   );
   ```

   ⚠️ **Investigate before finishing:** `SalesController` is annotated `@RequiredBusinessModules('RETAIL')`. Confirm restaurant sales still flow correctly — restaurant POS posts to `POST /sales` with a `kitchenOrderId`. If a restaurant-only business (`modules = ['RESTAURANT']`) is blocked by that decorator, change it to `@RequiredBusinessModules()` (no required module) and rely on the per-record `module` derivation instead. Record what you find in the PR description.

**File:** `frontend/src/app/api/client.ts` — `getSales(params)`

5. Add `module?: BusinessModule` to the `getSales` params type and forward it as a query-string param (follow the existing pattern used by `getPurchaseOrders`/`getTransfers`).

**File:** `frontend/src/modules/lib/domainQueries.ts` — `useSalesQuery`

6. Add `module?: BusinessModule` to its `params` type so façades can pass it.

**File:** `frontend/src/modules/lib/retail/salesQueries.ts` and the restaurant equivalent

7. `useRetailSalesQuery` → pass `{ module: 'RETAIL', ...params }`. Restaurant sales hook (in `restaurantQueries.ts`) → pass `{ module: 'RESTAURANT', ...params }`. Add a restaurant sales hook if one does not exist.

**Verify:** both builds green; a retail sales query returns no restaurant (`kitchenOrderId`-linked) sales and vice-versa.

---

## PHASE B — Module authorization (the core security fix) 🔴

**Problem:** The 4 operational controllers — `purchase-orders`, `suppliers`, `transfers`, `stock-movements` — accept a client-supplied `module` (query/body) and default it to `RETAIL`. Nothing verifies the caller's business actually has that module, so a client can read/write the other module's records by changing the value. `BusinessModulesGuard` exists but is (a) not applied to these 4 and (b) a *static* gate that ignores the per-request param.

### Task B1 — Enforce requested module ∈ `user.modules`

**Create a reusable check.** Add `backend/src/auth/assert-module-allowed.ts`:
```ts
import { ForbiddenException } from '@nestjs/common';
import { BusinessModule } from '@prisma/client';
import type { AuthenticatedUser } from './current-user.decorator';

/**
 * Resolves the effective module for a request and verifies the user's business
 * is entitled to it. Throws 403 if the requested module is not enabled.
 * If the user has exactly one module, that module is used and any mismatching
 * request is rejected.
 */
export function resolveModule(
  user: AuthenticatedUser,
  requested?: BusinessModule,
): BusinessModule {
  const enabled = user.modules as BusinessModule[];
  if (enabled.length === 0) {
    throw new ForbiddenException('No business modules enabled for this user');
  }
  if (!requested) {
    if (enabled.length === 1) return enabled[0];
    throw new ForbiddenException('module is required for a multi-module business');
  }
  if (!enabled.includes(requested)) {
    throw new ForbiddenException(`Not authorized for module "${requested}"`);
  }
  return requested;
}
```

**Apply it in all 4 controllers** (`purchase-orders`, `suppliers`, `transfers`, `stock-movements`). For **every** endpoint that currently does `module ?? BusinessModule.RETAIL`, replace that expression with `resolveModule(user, module)`. Worked example — `suppliers.controller.ts` `findAll`:
```ts
// before
return this.suppliersService.findAll(user.businessId, module ?? BusinessModule.RETAIL, active, ...);
// after
return this.suppliersService.findAll(user.businessId, resolveModule(user, module), active, ...);
```
Do the same for `findOne`, `update`, `remove`, and the `create` paths (for `create`, derive from `resolveModule(user, dto.module)` and stamp it onto the DTO before persisting). Apply the identical transformation to the other three controllers (they share the same `@Query('module') module?: BusinessModule` shape).

> **Do not** put per-request param logic inside `BusinessModulesGuard` (it's a static metadata gate used elsewhere). Keep using `resolveModule()` at the controller layer.

### Task B2 — Remove the `= BusinessModule.RETAIL` service defaults

Now that controllers always pass a validated module, change the service signatures in `suppliers`, `purchase-orders`, `transfers`, `stock-movements`, and `sales` from:
```ts
module: BusinessModule = BusinessModule.RETAIL,
```
to a **required** parameter:
```ts
module: BusinessModule,
```
This makes a missing module a compile/runtime error instead of a silent retail leak. Fix any internal callers that relied on the default.

### Task B3 — Close the update/remove TOCTOU

In the same 4 services, the pattern `findOne(id, businessId, module)` then `update({ where: { id } })` / `delete({ where: { id } })` lets the scope slip between check and write. Fold scope into the write:
```ts
// update
const result = await this.prisma.supplier.updateMany({
  where: { id, businessId, module },
  data,
});
if (result.count === 0) throw new NotFoundException(`Supplier #${id} not found`);
// then re-read for the response if the caller needs the full record
```
Use `deleteMany({ where: { id, businessId, module } })` for removes. Keep existing P2002/business-rule checks. Apply across suppliers, purchase-orders, transfers, stock-movements.

**Verify Phase B:** both builds green. Manually (or with a test): a user whose `modules = ['RETAIL']` gets **403** when requesting `?module=RESTAURANT` on any of the 4 controllers; a multi-module user must pass `module` explicitly.

---

## PHASE C — Migration / data integrity 🟡

### Task C1 — Fix supplier backfill for shared suppliers

**Problem:** `backend/prisma/migrations/20260615010000_operational_module_ownership/migration.sql` (lines 26–33) reassigns an **entire** supplier to `RESTAURANT` if it has *any* restaurant PO. A supplier used by both modules then vanishes from retail while retail POs still reference it. The new unique key `Supplier_businessId_name_module_key` supports one row **per module**, so shared suppliers should be **split**.

**Do not edit the already-applied migration.** Create a new forward migration `backend/prisma/migrations/<timestamp>_split_shared_suppliers/migration.sql` that:
1. Detects suppliers (now tagged `RESTAURANT` by the prior backfill) that **also** have retail POs (`PurchaseOrder.module = 'RETAIL'` referencing them).
2. For each such supplier, **inserts a duplicate RETAIL supplier row** (same `businessId`, `name`, contact fields, `module = 'RETAIL'`) and **repoints the retail POs'** `supplierId` to the new row.
3. Leaves the original row as the `RESTAURANT` supplier.

Provide it as idempotent SQL (guard with `WHERE NOT EXISTS` on the duplicate). After writing it:
```bash
cd backend && npx prisma migrate deploy && npx prisma generate
```
**Verify:** no supplier referenced by both a retail PO and a restaurant PO remains single-rowed; retail supplier queries show the retail copies.

---

## PHASE D — Finish frontend façade migration 🟡

### Task D1 — `MultiLocation.tsx`
`frontend/src/modules/restaurant/MultiLocation.tsx` line 4 imports `useRestaurantSettingsQuery` from `../lib/domainQueries`. Replace with the restaurant façade equivalent (`useRestaurantSettings` from `../lib/restaurantQueries`); add that hook to `restaurantQueries.ts` if missing. Remove the `domainQueries` import.

### Task D2 — `PurchaseOrders.tsx`
`frontend/src/modules/restaurant/PurchaseOrders.tsx` still imports raw `client` functions and `useDomainMutation` for the complex `saveOrder` orchestration (create-items → create/update PO → submit). Either:
- **(preferred)** wrap the orchestration in a named hook `useSaveRestaurantPurchaseOrderMutation` in `restaurantQueries.ts` and consume only that; or
- if kept inline, add a top-of-file comment marking it a sanctioned exception and ensure every client call passes `module: 'RESTAURANT'`.

**Verify:** `grep -rEln "from ['\"][^'\"]*(app/api/client|domainQueries)['\"]" frontend/src/modules/restaurant` returns only `PurchaseOrders.tsx` (if D2 kept inline) or nothing (if wrapped). Builds green.

---

## PHASE E — Architecture hardening & cleanup 🟢

Execute in order; each ends green.

- **E1 — ESLint façade boundary.** Add `no-restricted-imports` so files under `frontend/src/modules/retail/**` and `frontend/src/modules/restaurant/**` cannot import `app/api/client`, `modules/lib/domainQueries`, or `useQueryClient` directly — only the module façades. (Add an override exception for `PurchaseOrders.tsx` only if D2 was kept inline.) Run `npx eslint .` and fix fallout.
- **E2 — Fill `any` type gaps.** In `frontend/src/app/api/domainTypes.ts` add `ApiRecipe`, `ApiKitchenOrder`, `ApiCategory`, `ApiRestaurantSetting`, `ApiDiningTable`, `ApiNotification`; replace `any[]` in `useRecipesQuery`/`useKitchenOrdersQuery` (`domainQueries.ts`) and downstream.
- **E3 — Centralize cache invalidation.** Replace hand-listed `invalidateKeys` arrays with one dependency map (e.g. `inventory → [stockMovements, transfers, bundles]`) referenced by all mutation hooks.
- **E4 — Extract domain types.** Move production domain model types out of `frontend/src/app/utils/generateSampleData.ts` (1031 lines) into `frontend/src/models/` (`domain.ts`, `retail.ts`, `restaurant.ts`); leave only fixture generation behind. Update imports.
- **E5 — Split `restaurantQueries.ts`.** Mirror the retail structure: `modules/lib/restaurant/{shared,inventoryQueries,locationQueries,purchaseOrderQueries,transferQueries,salesQueries,kitchenQueries,index}.ts`, with `restaurantQueries.ts` re-exporting `./restaurant`.

---

## Definition of done

- `cd backend && npx nest build` → 0 errors.
- `cd frontend && npx tsc --noEmit && npx vite build` → clean.
- `npx prisma migrate status` → up to date; `db seed` succeeds.
- A retail-scoped user cannot read or write restaurant records (and vice-versa); requesting an unauthorized `module` returns 403.
- No restaurant/retail **view** imports `client.ts` or `domainQueries.ts` except a documented exception.

## Commit guidance
One commit (or PR) per phase: `A`, `B`, `C`, `D`, `E1`…`E5`. Keep each green. End commit messages with the project's required `Co-Authored-By` trailer.
```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```
