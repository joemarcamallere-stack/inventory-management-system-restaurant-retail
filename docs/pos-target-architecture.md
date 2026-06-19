# POS Target Architecture

## Direction

IMS remains one production app with one backend, one database schema, one auth/session model, and one module-aware frontend. The Bukolabs POS repo is a reference for workflows and UI, not a second production app.

## Approved Architecture Decisions

1. Restaurant POS uses a real open/unpaid `POSOrder` model.
2. `Payment` and `Receipt` are first-class backend models before receipt/payment screens are ported.
3. Store and POS settings are neutral, not restaurant-only:
   - `BusinessSetting` stores global business/store profile values.
   - `POSSetting` stores module-specific POS behavior for `RETAIL` and `RESTAURANT`.

Implemented foundation:

| Area | Status |
|---|---|
| Open/unpaid orders | `POSOrder` and `POSOrderItem` models plus `POST /api/pos-orders`, `GET /api/pos-orders`, `GET /api/pos-orders/:id`, `PATCH /api/pos-orders/:id/status`, `PATCH /api/pos-orders/:id/void`. |
| Payment/receipt persistence | `Payment` and `Receipt` models exist and can link to `POSOrder`, `Sale`, or both. Payment-completion and receipt-creation services are the next backend slice. |
| Neutral settings | `BusinessSetting` and `POSSetting` models plus `GET/PUT /api/business-settings` and `GET/PUT /api/pos-settings`. |

Current payment-completion scope:

- `PATCH /api/pos-orders/:id/complete-payment` completes inventory-backed POS orders.
- The endpoint atomically creates a `Sale`, deducts stock, writes `StockMovement`, creates `Payment`, creates `Receipt`, and marks the `POSOrder` as paid/completed.
- It also supports recipe-backed restaurant POS items by creating sale lines against the recipe's linked menu item and deducting recipe ingredients with `RECIPE_CONSUMPTION` stock movements.
- Kitchen ticketing and restaurant recipe refund reversal remain separate hardening slices.

The target frontend structure is:

```txt
frontend/src
├─ app
│  ├─ api
│  ├─ components
│  ├─ hooks
│  └─ App.tsx
├─ modules
│  ├─ retail
│  │  ├─ pos
│  │  ├─ reports
│  │  └─ existing retail screens
│  ├─ restaurant
│  │  ├─ pos
│  │  ├─ reports
│  │  └─ existing restaurant screens
│  ├─ shared
│  │  ├─ pos
│  │  ├─ receipts
│  │  └─ money
│  └─ lib
│     ├─ retail
│     └─ restaurant
```

POS should not become a top-level `POS` app beside IMS. It belongs inside the retail and restaurant modules because it shares inventory, sales, users, locations, reports, and stock movements.

The target backend shape is:

```txt
backend/src
├─ sales
├─ kitchen-orders
├─ dining-tables
├─ inventory
├─ stock-movements
├─ reports
├─ payments        # if approved
├─ receipts        # if approved
├─ pos-orders      # only if open/unpaid orders require a first-class model
└─ business-settings or pos-settings # if shared settings outgrow RestaurantSetting
```

## Current IMS Capabilities

Existing POS-relevant endpoints:

| Area | Current endpoint shape | Notes |
|---|---|---|
| Sales | `POST /api/sales`, `GET /api/sales`, `GET /api/sales/:id`, `PATCH /api/sales/:id/refund` | Transactional sale creation already deducts stock and writes `StockMovement`. |
| Kitchen orders | `POST /api/kitchen-orders`, `GET /api/kitchen-orders`, `PATCH /api/kitchen-orders/:id/status`, `PATCH /api/kitchen-orders/:id/void` | Supports recipe deduction on completion and void restock. |
| Dining tables | `POST /api/dining-tables`, `GET /api/dining-tables`, `PATCH /api/dining-tables/:id/status`, `DELETE /api/dining-tables/:id` | Does not yet perform automatic table status updates inside checkout. |
| Restaurant settings | `GET /api/restaurant-settings`, `PUT /api/restaurant-settings/:key` | Current enum only covers inventory/category settings, not receipt/store/POS settings. |

Existing model overlap:

| Bukolabs POS concept | IMS target |
|---|---|
| Store/tenant | `Business` |
| Store branch | `Location` |
| Product/ingredient/menu item | `InventoryItem` plus `Recipe` |
| Order item | `SaleItem` and/or `KitchenOrder` recipe quantity |
| Paid POS transaction | `Sale` |
| Inventory deduction | `StockMovement` |
| Restaurant table | `DiningTable` |
| Kitchen ticket | `KitchenOrder` |
| Store/receipt settings | new shared setting keys or model, not raw `store_information` |

## Key Decisions Before Backend Code

### 1. Sale-Only Vs Open-Order Flow

Current IMS creates `Sale` at checkout/payment time. Bukolabs restaurant POS supports unpaid/open order states:

```txt
Pending -> Preparing -> Ready -> Served -> Completed
Not Paid -> Paid/Void
Queue/Table assignment before payment
```

Decision needed:

| Option | Meaning | Recommendation |
|---|---|---|
| Sale-only | Create `Sale` only when payment is completed. Use `KitchenOrder` for restaurant prep state. | Best for first retail slice and simple restaurant checkout. |
| KitchenOrder as restaurant open order | Restaurant creates `KitchenOrder` before `Sale`; payment later links `Sale.kitchenOrderId`. | Best short-term restaurant path if one recipe/item per ticket is acceptable. |
| New `POSOrder` model | Add a first-class unpaid/open order header with items, payment status, table, queue, and later linked sale. | Best long-term match to Bukolabs, but larger schema/API work. |

Initial implementation recommendation: start with sale-only for retail, then decide whether restaurant needs `POSOrder` after mapping multi-item restaurant orders. Do not force the 2912-line `CreateOrder` workflow into `Sale` until this is settled.

### 2. Payment And Receipt Persistence

Current IMS stores payment summary directly on `Sale`:

```txt
paymentMethod
amountPaid
change
```

Bukolabs UI expects:

```txt
paymentId
receiptId
receipt reprint data
refund receipt metadata
void receipt metadata
```

Decision needed:

| Model | Need |
|---|---|
| `Payment` | Recommended if payment numbers, future split payments, payment audit, or payment method reports matter. |
| `Receipt` | Recommended if receipt reprint, receipt numbering, and stable receipt snapshots matter. |
| `Refund` | Recommended before partial refunds. Full refund can temporarily live on `Sale` with `refundedAt`. |
| `VoidTransaction` | Optional if kitchen void and sale refund records are enough; useful for audit UI. |

Initial implementation recommendation: add `refundedAt` first if reporting/refund policy is in scope. Add `Payment` and `Receipt` before porting receipt-heavy screens if receipt IDs/reprints are launch requirements.

### 3. Shared POS Settings

Current `RestaurantSettingKey` only contains:

```txt
CATEGORY_HIERARCHY
STORAGE_TEMPERATURE_OPTIONS
PRODUCT_MERGE_METADATA
```

Bukolabs settings include:

```txt
business_name
address
contact_number
email
logo
receipt_thank_you_message
receipt_footer_message
currency
theme_color
tax_rate
service_charge_rate
enabled_payment_methods
enable_refund
enable_void
enable_discount
enable_receipt_printing
```

Decision needed: these are not restaurant-only. They should either become neutral `BusinessSetting`/`POSSetting` records or be added to a renamed/shared settings module. Keeping them under `RestaurantSetting` is fast but semantically weak for retail.

Initial implementation recommendation: create a neutral settings abstraction before full store/receipt settings UI is ported.

### 4. Server-Side Reporting

Server-side reports are required for production. Minimum launch endpoints should be limited to the screens we port first:

```txt
GET /api/reports/sales-summary
GET /api/reports/sales-by-period
GET /api/reports/sales-by-payment-method
GET /api/reports/sales-by-item
```

Defer advanced breakdowns unless the first migrated dashboards require them:

```txt
sales-by-category
sales-by-cashier
sales-by-location
kitchen-throughput
void/refund analytics
```

### 5. SuperAdmin Scope

Bukolabs has a Superadmin dashboard. IMS currently scopes every normal user to a required `businessId`. Cross-business SuperAdmin changes tenancy and should not be bundled into the first checkout migration unless launch requires it.

Initial implementation recommendation: defer SuperAdmin until after checkout/payment/receipt slices are stable.

## Initial Gap Table

| Screen/source | Data needed | Existing IMS endpoint/model | Gap |
|---|---|---|---|
| `retail/pages/RetailCreateOrder.tsx` | products, cart, discount/tax, payment method, paid order | `GET /api/inventory`, `POST /api/sales` | Needs frontend hook rewrite; discount type/payment ID/receipt ID may need schema if required. |
| `retail/pages/RetailOrderList.tsx` | sales list, refund, void, receipt reprint | `GET /api/sales`, `PATCH /api/sales/:id/refund` | Full refund only; no partial item refund; no sale void endpoint; no receipt model. |
| `retail/pages/RetailReports.tsx` | sales totals, payment split, discount/refund metrics | none yet | Needs server-side `reports` module. |
| `restaurant/pages/CreateOrder.tsx` | menu items, modifiers, table/order type, cart, service/tax/discount, open order/payment | `GET /api/recipes`, `GET /api/inventory`, `POST /api/kitchen-orders`, `POST /api/sales` | Needs open-order decision; multi-item restaurant order mapping is unresolved. |
| `restaurant/pages/Payment.tsx` | unpaid order, amount paid, change, payment ID, receipt ID | `POST /api/sales` | Needs decision on unpaid order source and receipt/payment persistence. |
| `restaurant/pages/TableManagement.tsx` | tables, table status, queued orders, table history | `GET/PATCH /api/dining-tables`, `GET /api/kitchen-orders` | No queue/table-history model; statuses differ (`MAINTENANCE` maps to IMS `CLEANING` or needs enum change). |
| `restaurant/pages/KitchenQueue.tsx` | pending/preparing/ready/completed tickets | `GET/PATCH /api/kitchen-orders` | Mostly covered; verify status wording and whether `SERVED` is needed. |
| `restaurant/pages/OrderList.tsx` | restaurant order list, payment status, void/refund, receipt | `GET /api/sales`, `GET /api/kitchen-orders`, refund/void endpoints | Needs unified order-list projection or careful client composition. |
| `shared/components/StoreInformation.tsx` | business profile, receipt header/footer, logo | `RestaurantSetting` only | Needs neutral settings/profile decision. |
| `shared/components/StoreSettings.tsx` | refund/void toggles, discount types, tax/service charge, payment methods | partial `RestaurantSetting` only | Needs POS settings and possibly discount settings model. |

## First Implementation Slice

The safest first coding target is retail checkout because it has fewer dependencies:

```txt
Retail inventory item -> local cart -> POST /api/sales -> stock movements -> receipt-ready response -> sales history
```

Restaurant checkout should follow only after we decide how multi-item/open orders map into IMS:

```txt
Restaurant order -> kitchen/table state -> payment -> sale -> receipt -> stock/ingredient deduction
```
