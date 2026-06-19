# POS and IMS Team Workflow

IMS remains one production app. The teams work in separate ownership areas inside the same repo, with shared API contracts as the coordination point.

## Ownership

### IMS Team Owns

- `backend/src`
- `backend/prisma`
- `frontend/src/app`
- `frontend/src/app/api`
- Existing non-POS IMS retail and restaurant screens
- Auth/session/business/module scoping
- Inventory, sales, stock movements, users, locations, and database migrations

### POS Team Owns

- `frontend/src/modules/retail/pos`
- `frontend/src/modules/restaurant/pos`
- POS workflow screens:
  - Create Order
  - Payment
  - Receipt
  - Order List
  - Kitchen Queue
  - Table Management POS-facing workflow
  - POS Settings
  - POS Reports frontend behavior

### Shared Review Areas

Changes here should be reviewed by both teams:

- `frontend/src/app/api`
- `frontend/src/modules/lib/retail`
- `frontend/src/modules/lib/restaurant`
- `frontend/src/modules/shared/pos`
- `frontend/src/modules/shared/receipts`
- `frontend/src/modules/shared/money`
- `frontend/src/modules/retail/reports`
- `frontend/src/modules/restaurant/reports`
- `docs/pos-*`

## Rules Of Engagement

1. POS screens should use typed API clients and module hooks, not raw fetch calls.
2. Stock deduction, recipe deduction, payment completion, refunds, voids, and receipt persistence stay in backend services.
3. Backend/API/schema changes require IMS review.
4. POS workflow or screen behavior changes require POS review.
5. Shared hooks/types require both reviews.
6. Old route aliases can remain for compatibility, but new POS work should use the POS-faithful screen names.
7. Do not import Bukolabs backend code, SQL scripts, Supabase config, or duplicate UI kits into IMS.

## Branch Naming

Use prefixes that make ownership obvious:

```txt
pos/frontend-fidelity-create-order
pos/receipt-ui-polish
pos/table-management-layout
ims/backend-pos-payment-hardening
ims/reports-performance
ims/schema-pos-order-indexes
shared/api-receipt-contract
docs/pos-acceptance-update
```

## Pull Request Expectations

Use `.github/pull_request_template.md`.

For backend/API/schema changes, include:

- What endpoint/model/DTO changed
- Whether migrations are required
- Backend build/test result
- Any frontend API type updates

For POS frontend changes, include:

- Which POS screen changed
- Which acceptance checklist items are affected
- Frontend build/test result
- Screenshots or notes from manual QA when visual fidelity changed

## Branch Protection Setup

After creating the GitHub teams used in `.github/CODEOWNERS`, enable branch protection on the main production branch:

- Require pull request reviews before merge
- Require review from Code Owners
- Require status checks to pass
- Require branches to be up to date before merge
- Disallow force pushes

Proposed teams in `CODEOWNERS`:

```txt
@joemarcamallere-stack/ims-team
@joemarcamallere-stack/pos-team
```

Replace these if your GitHub org/team names differ.
