# POS Frontend Fidelity Acceptance

This checklist is for POS-team review. The target is not to copy the Bukolabs backend; IMS remains the production backend and transaction system. The target is to keep the POS workflow, screen names, and operator-facing behavior familiar enough that the POS team can continue the frontend faithfully.

Reference repo: `C:\Users\Joemar S. Camallere\Documents\POS\Bukolabs-POS`

## Restaurant POS

### POS Dashboard

- [ ] Opens from `restaurant-pos-dashboard`.
- [ ] New Order action opens `restaurant-create-order`.
- [ ] Reports action opens `restaurant-reports`.
- [ ] Kitchen action opens `restaurant-kitchen-queue`.
- [ ] Shows sales, open orders, kitchen, and table signals.

### Create Order

- [ ] Opens from `restaurant-create-order`.
- [ ] Supports menu search and category filtering.
- [ ] Supports dine-in and takeout.
- [ ] Supports table selection for dine-in/mixed orders.
- [ ] Supports cart quantity edits and item removal.
- [ ] Supports per-item notes/customizations.
- [ ] Supports senior/PWD/promo/custom discounts.
- [ ] Pay Now can complete the transaction immediately.
- [ ] Save and Continue to Payment creates an unpaid POS order and opens Payment.
- [ ] Uses IMS `POSOrder` without deducting stock until payment completion.

### Payment

- [ ] Opens from `restaurant-payment`.
- [ ] Can load a selected order via `orderId`.
- [ ] Lists unpaid restaurant orders.
- [ ] Allows payment method selection from POS settings.
- [ ] Supports cash amount and change calculation.
- [ ] Confirm Payment completes the IMS transaction.
- [ ] After payment, navigates to `restaurant-receipt` with receipt context.

### Receipt

- [ ] Opens from `restaurant-receipt`.
- [ ] Can load a selected receipt via `receiptId` or `orderId`.
- [ ] Shows printable receipt preview.
- [ ] Supports receipt print.
- [ ] Lists recent restaurant receipts for reprint/review.

### Order List

- [ ] Opens from `restaurant-order-list`.
- [ ] Lists restaurant POS orders.
- [ ] Supports receipt review/reprint.
- [ ] Supports refund for paid orders.
- [ ] Supports void for unpaid orders.

### Kitchen Queue

- [ ] Opens from `restaurant-kitchen-queue`.
- [ ] Shows POS-linked kitchen tickets.
- [ ] Keeps manual recipe deduction distinct from POS tickets.
- [ ] Supports expected kitchen statuses.

### Table Management

- [ ] Opens from `restaurant-table-management`.
- [ ] Shows table status, capacity, location, and floor.
- [ ] Supports create/edit/delete/status management.
- [ ] Reflects occupied/released state from POS order lifecycle.

## Retail POS

### Retail POS Dashboard

- [ ] Opens from `pos-dashboard`.
- [ ] New Order action opens `retail-create-order`.
- [ ] Reports action opens `reports`.
- [ ] Shows sales, orders, and payment/item signals.

### Retail Create Order

- [ ] Opens from `retail-create-order`.
- [ ] Supports product search and category filtering.
- [ ] Supports cart quantity edits and item removal.
- [ ] Supports customer name and discount.
- [ ] Completes checkout through IMS `POSOrder -> Payment -> Receipt -> Sale`.
- [ ] Deducts stock only after payment completion.
- [ ] Sale-complete modal can open the stored thermal receipt.

### Retail Order List

- [ ] Opens from `retail-order-list`.
- [ ] Lists retail POS orders.
- [ ] Supports receipt review/reprint.
- [ ] Supports refund for paid orders.
- [ ] Supports void for unpaid orders if any exist.

### Retail Thermal Receipt

- [ ] Opens from `retail-thermal-receipt`.
- [ ] Can load selected receipt via `receiptId`.
- [ ] Lists recent retail receipts.
- [ ] Shows printable thermal receipt preview.
- [ ] Supports print.

### Retail Reports

- [ ] Opens from `reports`.
- [ ] Shows server-side summary, trend, item, payment, location, cashier, and order-type breakdowns.
- [ ] Supports CSV export.

## Cross-Cutting

- [ ] Role navigation lands cashiers on the correct POS workflow.
- [ ] Old aliases remain non-breaking while POS-team screen names are adopted.
- [ ] Screens use IMS API/auth/module scoping.
- [ ] No Bukolabs raw SQL, Supabase config, duplicate UI kit, or backend runtime is imported.
- [ ] Final acceptance is tested with real migrated sample data.
