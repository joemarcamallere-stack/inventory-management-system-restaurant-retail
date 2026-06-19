# POS Migration Checklist

This checklist tracks the migration from `C:\Users\Joemar S. Camallere\Documents\POS\Bukolabs-POS` into this IMS monorepo. The POS repo is a reference implementation only; the IMS NestJS + Prisma backend remains the production system of record.

## Phase 0 - Branch And Scaffolding

- [x] Create integration branch: `pos-integration`.
- [x] Confirm POS reference repo is outside this IMS working tree.
- [x] Confirm POS reference remote: `https://github.com/Lmaw-dev/Bukolabs-POS.git`.
- [x] Add migration checklist.
- [x] Add target architecture and gap-analysis notes.
- [ ] Verify root dependency install if needed.
- [x] Verify backend build.
- [x] Verify frontend build.
- [ ] Start backend and frontend dev servers when ready for interactive testing.

Gate 0 status: passed for branch/docs/build baseline. Dependency install and dev-server startup can be verified when interactive testing begins.

## Phase 1 - Backend Gap Analysis

- [x] Inspect existing IMS controllers for POS-relevant routes.
- [x] Inspect existing sale checkout DTO/service behavior.
- [x] Inspect existing kitchen order DTO/service behavior.
- [x] Inspect existing restaurant setting model/key behavior.
- [x] Inspect POS order contexts and major screen responsibilities.
- [x] Finalize sale-only vs open-order decision: restaurant POS uses real open/unpaid `POSOrder`.
- [x] Finalize payment/receipt persistence decision: `Payment` and `Receipt` are first-class models.
- [x] Finalize shared POS settings model decision: neutral `BusinessSetting` and `POSSetting`.
- [x] Finalize first-launch report endpoint set.
- [x] Decide whether SuperAdmin is launch scope or deferred: deferred, pending tenancy discussion.

Gate 1 status: passed. Initial gaps are documented in `docs/pos-target-architecture.md`; SuperAdmin is explicitly deferred.

## Phase 2 - Backend Core

- [ ] Implement only the backend gaps approved in Phase 1.
- [ ] Add migrations for any new schema fields/models.
- [ ] Add or update DTO validation.
- [ ] Add transactional checkout tests.
- [x] Add refund timestamp migration and service support.
- [x] Add refund test asserting `refundedAt` is set and original monetary fields are unchanged.
- [x] Add minimum server-side reporting endpoints.
- [x] Add report tests for refund-date attribution and restaurant void separation.
- [x] Add Prisma schema/migration foundation for `POSOrder`, `POSOrderItem`, `Payment`, `Receipt`, `BusinessSetting`, and `POSSetting`.
- [x] Add neutral business/POS settings endpoints.
- [x] Add open POS order endpoints.
- [x] Add POS order unit tests confirming open orders do not deduct stock, inventory-backed payment completion writes sale/payment/receipt/stock movement atomically, and restaurant recipe payment deducts ingredients.
- [x] Add POS order payment-completion endpoint.
- [x] Add payment history endpoints.
- [x] Add receipt history and mark-printed/reprint support endpoints.
- [x] Add payment/receipt service tests for business/module scoping.
- [x] Add restaurant recipe refund reversal so ingredient consumption is restored instead of restocking menu-item sale lines.

Gate 2 status: passed for refund timestamp, minimum reporting, neutral settings, open POS orders, inventory-backed POS payment completion, recipe-backed restaurant ingredient deduction/refund reversal, kitchen ticketing, and payment/receipt history.

## Phase 3 - Frontend Data Layer

- [x] Extend `frontend/src/app/api/domainTypes.ts` with report response/query shapes.
- [x] Extend `frontend/src/app/api/client.ts` with report endpoint functions.
- [x] Add typed retail/restaurant report query hooks under `frontend/src/modules/lib`.
- [x] Add POS order/payment query and mutation hooks under `frontend/src/modules/lib`.
- [x] Add shared payment/receipt client functions and module-scoped retail/restaurant hooks.
- [x] Add local cart hook/context scoped to POS screens.
- [x] Add POS cart logic tests for stock clamping, totals, POS order payloads, and sale payload compatibility.
- [x] Wire retail POS screen to shared POS cart state while preserving current checkout behavior.
- [x] Move shared POS cart logic under `frontend/src/modules/shared/pos`.
- [x] Create target frontend homes for shared POS, receipts, money, retail POS, retail reports, restaurant POS, and restaurant reports.

Gate 3 status: passed for reporting hooks, POS order hooks, payment/receipt hooks, shared local POS cart state, and target frontend folder structure.

## Phase 4 - POS Vertical Slices

- [x] Retail checkout slice: product -> cart -> payment -> receipt -> stock deduction -> sales history.
- [x] Switch retail POS checkout from direct `POST /api/sales` to `POSOrder -> complete-payment -> Sale + Payment + Receipt`.
- [x] Extract receipt snapshot creation into `frontend/src/modules/shared/receipts`.
- [x] Restaurant checkout slice: menu/order -> payment -> receipt -> recipe stock deduction.
- [x] Restaurant table automation: dine-in POS orders use real dining tables and keep table occupancy in sync on create/payment/void.
- [x] Restaurant kitchen ticket automation: recipe-backed POS orders create POS-linked pending kitchen tickets without duplicate recipe stock deduction.
- [x] Add `frontend/src/modules/restaurant/pos/RestaurantPOSView.tsx` for recipe-backed restaurant checkout.
- [x] Route `restaurant-pos` to Restaurant POS and preserve old kitchen receipt workflow under `restaurant-kitchen-orders`.
- [x] Port POS dashboards after the checkout slices work.
- [x] Port POS reports after server-side report endpoints exist.

Gate 4 status: passed for core POS vertical slices. Retail and restaurant checkout, payment/receipt flow, table automation, kitchen ticket automation, POS dashboards, and POS reports now run through the IMS transaction/report backbone.

## Phase 4b - Full Functional Parity (see `docs/pos-migration-plan.md` section 4b for detail)

Slice A - Checkout accuracy hardening (do first; same screens already shipped):
- [x] Per-item notes/customization UI (fields already exist on `POSCartItem`).
- [x] Structured discount types (senior/PWD/promo/custom) with percentage calc and ID/reference capture.
- [x] Per-item order type so a single order can mix dine-in and takeout (`Mixed`).
- [x] Receipt print integration (`window.print()` equivalent).

Slice B - Remaining restaurant screens:
- [x] Dedicated `TableManagement` screen (floor/capacity/status, beyond inline checkout select).
- [x] `OrderList` (restaurant): history, refund, void, receipt reprint UI.
- [x] `KitchenQueue` parity check against existing kitchen-ticket automation; confirm status wording.

Slice C - Remaining retail screens:
- [x] `RetailOrderList` parity check against existing `SalesHistoryView`.
- [x] `RetailThermalReceipt` dedicated print-formatted receipt component.

Slice D - Reporting screens:
- [x] Port `Reports`/`RetailReports` UI against `/api/reports/*`.

Slice E - Settings UI:
- [x] `StoreInformation`/`StoreSettings` UI wired to `BusinessSetting`/`POSSetting`.

Slice F - SuperAdmin:
- [ ] Port `SuperadminDashboard` (deferred; blocked on cross-business tenancy-scope decision).

Slice G - Role-based nav (cross-cutting, not Bukolabs-sourced):
- [x] Filter sidebar nav + default landing view by `UserRole` (e.g. Cashier lands on POS only).

Gate 4b status: passed for the current migration scope. Restaurant POS history/refund/void/reprint, retail POS history/refund/void/reprint, server-backed reports, settings UI, role-based navigation, dedicated table management, restaurant checkout customization/discount detail, receipt print integration, kitchen wording parity, and retail thermal receipt parity are complete. SuperAdmin is deferred and not part of this pass.

## Phase 4c - POS Frontend Fidelity Phase (see `docs/pos-migration-plan.md` section 4c)

Functional parity (4b) is done. This phase targets POS-faithful screen boundaries, workflow, and layout — not backend rework, not literal Bukolabs filenames/colors. IMS backend, auth, API client, and design tokens stay as-is.

Step 1 - Move consolidated `RestaurantPOSView.tsx` cart/order/payment/receipt logic into shared hooks/state under `modules/shared/pos`:
- [ ] Extract logic so screen-splitting in Step 2 is mechanical, not a rewrite.

Step 2 - Build POS-faithful `XxxView.tsx` screen boundaries (IMS's existing naming convention, not literal Bukolabs filenames):
- [ ] Restaurant: `CreateOrderView.tsx` -> `PaymentView.tsx` -> `ReceiptView.tsx` as a local step flow (replacing the single screen + modals).
- [ ] `OrderListView.tsx`, `TableManagementView.tsx` (already separate), `KitchenQueueView.tsx`, `ReportsView.tsx`, `SettingsView.tsx` (one consolidated settings screen, confirmed intentional).
- [ ] Retail: mirror the same `XxxView.tsx` pattern under `modules/retail/pos` for whichever screens Bukolabs separated on the retail side.
- [ ] `POSDashboardView.tsx` (already ported) confirmed out of scope for this fidelity pass.
- [ ] Wire every view to existing IMS API client/hooks — no new backend endpoints.

Step 3 - Layout/spacing/workflow fidelity, IMS tokens retained (not Bukolabs literal hex/px):
- [ ] Match Bukolabs' spacing, layout structure, and interaction order per screen using IMS's existing design tokens.

Step 4 - Visual QA pass: side-by-side comparison, Bukolabs dev server vs IMS dev server, screen by screen. Confirm `SettingsView` consolidation and `POSDashboard` exclusion read as intentional, not missing.

Step 5 - Shell and login (separate, still open from earlier discussion, not required for this phase):
- [ ] Login page restyle to Bukolabs visual design (IMS auth wiring unchanged).
- [ ] App shell restyle (`App.tsx` sidebar/header) to match Bukolabs `Sidebar.tsx` visuals (IMS stays app root).

Step 6 - SuperAdmin: deferred and still gated on tenancy-scope decision (see Slice F).

Gate 4c status: not started.

## Phase 5 - Refunds, Voids, Settings, And Reporting Hardening

- [ ] Add refund timestamp policy support if approved.
- [x] Add receipt reprint support if approved.
- [x] Add store/receipt/tax/service-charge settings UI. (see Phase 4b Slice E)
- [x] Add restaurant recipe refund reversal and keep linked POS order/payment status in sync on sale refunds.
- [x] Add restaurant POS history screen for refund, unpaid void, and receipt reprint operations.
- [x] Add advanced report breakdowns.

Gate 5 status: in progress. Core refund/void/reprint/settings hardening and advanced report breakdowns are implemented and verified; launch-policy decisions remain.

## Phase 6 - Cleanup And Docs

- [x] Defer SuperAdmin until tenancy design is approved. (see Phase 4b Slice F)
- [x] Confirm no Bukolabs backend, SQL scripts, Supabase config, MUI dependency, or duplicate UI kit leaked into IMS.
- [x] Update README.
- [x] Final full backend/frontend builds.
- [ ] Only after Phase 4b slices (or explicitly descoped items) are resolved: freeze/archive `Bukolabs-POS` as the canonical historical record.

Gate 6 status: passed for the current migration scope. SuperAdmin is descoped, duplicate MUI/UI-kit leakage has been cleaned, README is updated, and backend/frontend builds pass.

## Phase 7 - POS Frontend Fidelity

Direction: keep the IMS backend/API/transaction model, but expose Bukolabs-style POS screen names and workflow boundaries so the POS team can continue from a familiar frontend structure.

- [x] Re-check Bukolabs POS frontend source screen inventory from `C:\Users\Joemar S. Camallere\Documents\POS\Bukolabs-POS\frontend\src`.
- [x] Add restaurant POS-faithful screen homes: `CreateOrder`, `Payment`, `Receipt`, `OrderList`, and `KitchenQueue`.
- [x] Add retail POS-faithful screen homes: `RetailCreateOrder`, `RetailOrderList`, and `RetailThermalReceipt` route surface.
- [x] Wire sidebar/dashboard navigation to POS-faithful screen names while preserving old route aliases.
- [x] Split restaurant checkout internals further so payment/receipt are true continuation screens, not just dedicated history/work-queue surfaces.
- [x] Make retail `RetailThermalReceipt` a real receipt review/print screen backed by stored IMS receipts.
- [ ] Tighten visual fidelity screen-by-screen against Bukolabs layouts where it helps POS-team continuity.
- [x] Add a screen-by-screen acceptance checklist for POS team review.

Gate 7 status: in progress. Screen structure, navigation, restaurant continuation flow, retail thermal receipt review, and acceptance checklist are in place; deeper visual fidelity remains.

## Phase 8 - Team Workflow Safety

- [x] Add CODEOWNERS boundaries for IMS-owned, POS-owned, and shared-review areas.
- [x] Add PR template with contract-impact and verification checklist.
- [x] Add POS/IMS team workflow guide.
- [ ] Create or replace the GitHub teams named in `.github/CODEOWNERS`.
- [ ] Enable branch protection with required code-owner reviews.

Gate 8 status: partially complete. Repo-level ownership files and workflow docs are in place; GitHub team creation and branch protection must be done in GitHub.
