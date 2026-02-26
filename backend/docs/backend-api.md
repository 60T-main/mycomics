# Backend API Documentation

Base URL (dev)

- http://localhost:8000

Auth and identity

- Logged-in: Django session cookie.
- Anonymous: anon_token cookie set by backend, or X-Anonymous-Token header for non-browser clients.
- All endpoints return JSON.

CORS/CSRF (dev)

- CORS allowed origin: http://localhost:3000
- Credentials allowed: true (cookies)
- CSRF trusted origin: http://localhost:3000

---

## Customers API

Base: /api/customer/

POST /api/customer/register/

- Body: username, password, email, first_name, last_name, phone
- Creates a user and logs in.

POST /api/customer/login/

- Body: username (or email), password

POST /api/customer/logout/

GET /api/customer/status/

- Returns loggedIn flag.

GET /api/customer/user/

- Returns current user profile if logged in.

PUT /api/customer/edit/

- Body: username, password, email, first_name, last_name, phone

GET|POST|PUT /api/customer/address/

- Anonymous requires anon_token cookie/header.
- Uses Address.session_key for anonymous.

---

## Products API

Base: /api/product/

Books

- GET /books/
- POST /books/
  - Anonymous: only 1 book allowed (per anon profile)
  - Sets Book.session_key to anon token
- GET|PUT|PATCH|DELETE /books/<uuid:item_id>/

Characters

- GET /characters/
- POST /characters/
  - Anonymous: allowed once, must match Book.session_key
- GET|PUT|PATCH|DELETE /characters/<uuid:item_id>/

Character Versions

- GET /character-versions/
- POST /character-versions/
  - Logged-in: allowed, consumes retry allowance
  - Anonymous: blocked (no regeneration)
  - Server assigns version_number
- GET|PUT|PATCH|DELETE /character-versions/<uuid:item_id>/

Cover Versions

- GET /cover-versions/
- POST /cover-versions/
  - Logged-in: allowed, consumes retry allowance
  - Anonymous: blocked (no regeneration)
  - Server assigns version_number
- GET|PUT|PATCH|DELETE /cover-versions/<uuid:item_id>/

Pages

- GET /pages/ (logged-in only)
- POST /pages/ (logged-in only)
- GET|PUT|PATCH|DELETE /pages/<uuid:item_id>/ (logged-in only)

Page Versions

- GET /page-versions/ (logged-in only)
- POST /page-versions/ (logged-in only)
  - Consumes retry allowance
  - Server assigns version_number
- GET|PUT|PATCH|DELETE /page-versions/<uuid:item_id>/ (logged-in only)

Retry Pack Apply

- POST /retries/add/
- Body: content_type (CHARACTER|COVER|PAGE), content_id, retry_pack_order_id
- Requires: paid RetryPackOrder, must match item and user

---

## Orders API

Base: /api/orders/

POST /create/

- Body:
  - tier_name
  - delivery_address_id
  - delivery_cost (optional)
  - total_amount (optional)
  - items: [{ book_id, quantity, unit_price }]
- Anonymous: requires anon_token and ownership of book and address

POST /payment/webhook/

- Body: order_id, status=paid, customer_id (optional), transaction_id (optional)
- If customer_id missing: auto-registers from delivery address email/phone
- Triggers anonymous ownership claim when paid
- Optional header: X-Webhook-Secret

POST /retry-pack/create/

- Auth required
- Body: content_type, content_id
- Creates a pending order (tier_name=retry_pack, total_amount=2) and retry pack
- Response includes order_id and retry_pack_order_id

---

## Billing API

Base: /api/billing/

GET /tiers/

- Returns active pricing tiers

GET /ledger/

- Auth required
- Returns user ledger entries

---

## Retry Rules

- PricingTier.max_retries_per_unit is the base retry limit per item
- RetryAllowance tracks used vs max per item
- Retry packs add +3 retries per item for 2 GEL

---

## Common Errors

- 401: Authentication required (pages, retry pack apply, ledger)
- 403: Ownership or retry limit violations
- 400: Validation errors

---

## Notes

- Anonymous ownership uses anon_token cookie/header and IP/UA hash validation.
- Address for anonymous users uses Address.session_key = anon_token.
- Payment provider integration is external; webhook expects a paid status.
