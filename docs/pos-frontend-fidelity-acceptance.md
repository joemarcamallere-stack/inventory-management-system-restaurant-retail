# POS Frontend Fidelity Acceptance

This checklist is for POS-team review. The target is not to copy the Bukolabs backend; IMS remains the production backend and transaction system. The target is to keep the POS workflow, screen names, and operator-facing behavior familiar enough that the POS team can continue the frontend faithfully.

Reference repo: `C:\Users\Joemar S. Camallere\Documents\POS\Bukolabs-POS`

## Fidelity Pass - 2026-06-19

- Source pass completed against the cloned Bukolabs POS repo above.
- IMS now keeps separate POS-team screen homes while legacy aliases remain wrappers.
- IMS shell navigation now separates POS and inventory/admin workspaces so POS operators see a Bukolabs-style POS menu instead of the full IMS inventory menu.
- Backend fidelity is IMS-native, not Bukolabs-native: orders flow through `POSOrder -> Payment -> Receipt -> Sale`, and stock deduction remains payment-time only.
- Bukolabs post-login reference screenshots were captured from `http://localhost:5190/` using the provided restaurant and retail admin accounts. Screenshots are in `tmp/pos-fidelity/logged-in/`.
- Visual acceptance is not final POS-team signoff yet. The reference screenshots are ready for side-by-side comparison, but IMS still needs the same real-data browser review before this can be marked fully accepted.

## Restaurant POS

### POS Dashboard

- [x] Opens from `restaurant-pos-dashboard`.
- [x] New Order action opens `restaurant-create-order`.
- [x] Reports action opens `restaurant-reports`.
- [x] Kitchen action opens `restaurant-kitchen-queue`.
- [x] Shows sales, open orders, kitchen, and table signals.

### Create Order

- [x] Opens from `restaurant-create-order`.
- [x] Supports menu search and category filtering.
- [x] Supports dine-in and takeout.
- [x] Supports table selection for dine-in/mixed orders.
- [x] Supports cart quantity edits and item removal.
- [x] Supports per-item notes/customizations.
- [x] Supports senior/PWD/promo/custom discounts.
- [x] Pay Now can complete the transaction immediately.
- [x] Save and Continue to Payment creates an unpaid POS order and opens Payment.
- [x] Uses IMS `POSOrder` without deducting stock until payment completion.

### Payment

- [x] Opens from `restaurant-payment`.
- [x] Can load a selected order via `orderId`.
- [x] Lists unpaid restaurant orders.
- [x] Allows payment method selection from POS settings.
- [x] Supports cash amount and change calculation.
- [x] Confirm Payment completes the IMS transaction.
- [x] After payment, navigates to `restaurant-receipt` with receipt context.

### Receipt

- [x] Opens from `restaurant-receipt`.
- [x] Can load a selected receipt via `receiptId` or `orderId`.
- [x] Shows printable receipt preview.
- [x] Supports receipt print.
- [x] Lists recent restaurant receipts for reprint/review.

### Order List

- [x] Opens from `restaurant-order-list`.
- [x] Lists restaurant POS orders.
- [x] Supports receipt review/reprint.
- [x] Supports refund for paid orders.
- [x] Supports void for unpaid orders.

### Kitchen Queue

- [x] Opens from `restaurant-kitchen-queue`.
- [x] Shows POS-linked kitchen tickets.
- [x] Keeps manual recipe deduction distinct from POS tickets.
- [x] Supports expected kitchen statuses.

### Table Management

- [x] Opens from `restaurant-table-management`.
- [x] Shows table status, capacity, location, and floor.
- [x] Supports create/edit/delete/status management.
- [x] Reflects occupied/released state from POS order lifecycle.

## Retail POS

### Retail POS Dashboard

- [x] Opens from `pos-dashboard`.
- [x] New Order action opens `retail-create-order`.
- [x] Reports action opens `reports`.
- [x] Shows sales, orders, and payment/item signals.

### Retail Create Order

- [x] Opens from `retail-create-order`.
- [x] Supports product search and category filtering.
- [x] Supports cart quantity edits and item removal.
- [x] Supports customer name and discount.
- [x] Completes checkout through IMS `POSOrder -> Payment -> Receipt -> Sale`.
- [x] Deducts stock only after payment completion.
- [x] Sale-complete modal can open the stored thermal receipt.

### Retail Order List

- [x] Opens from `retail-order-list`.
- [x] Lists retail POS orders.
- [x] Supports receipt review/reprint.
- [x] Supports refund for paid orders.
- [x] Supports void for unpaid orders if any exist.

### Retail Thermal Receipt

- [x] Opens from `retail-thermal-receipt`.
- [x] Can load selected receipt via `receiptId`.
- [x] Lists recent retail receipts.
- [x] Shows printable thermal receipt preview.
- [x] Supports print.

### Retail Reports

- [x] Opens from `reports`.
- [x] Shows server-side summary, trend, item, payment, location, cashier, and order-type breakdowns.
- [x] Supports CSV export.

## Cross-Cutting

- [x] POS admin shell shows Bukolabs-style Dashboard, Staff Accounts, Transactions, Reports, Store, Temporary, and Logout navigation.
- [x] Restaurant Staff Accounts opens from `restaurant-staff-accounts`.
- [x] Retail Staff Accounts opens from `pos-staff-accounts`.
- [x] Staff Accounts supports list, search, role/status filtering, create, edit, reset password, activate/deactivate, and delete through IMS `/api/users`.
- [x] Role navigation lands cashiers on the correct POS workflow.
- [x] Old aliases remain non-breaking while POS-team screen names are adopted.
- [x] POS and inventory/admin screens are separated into distinct workspaces in the app shell.
- [x] Screens use IMS API/auth/module scoping.
- [x] No Bukolabs raw SQL, Supabase config, duplicate UI kit, or backend runtime is imported.
- [ ] Final acceptance is tested with real migrated sample data.
