# Testing Guide (Manual + Automated)

This project supports two testing approaches:

1. **Manual API testing** via Postman collection
2. **Automated integration testing** via Jest + Supertest + mongodb-memory-server

---

## 1) Manual Testing (Postman)

### Prerequisites

- API running locally or deployed
- MongoDB accessible (Atlas/local)
- Postman collection imported:
  - `docs/postman/Mini E-Commerce API.postman_collection.json`
- Base URL set correctly in collection variables

### Recommended manual flow

1. Health Check
2. Register Admin (Protected)
3. Admin Login
4. Create Product (Admin)
5. Register User
6. User Login
7. Add To Cart
8. Get Cart
9. Place Order
10. Get My Orders
11. Cancel Order (customer scenario)
12. Admin status update flow (Pending → Shipped → Delivered)

---

## 2) Manual Edge Cases to Verify

### Auth

- Register same email twice → `400`
- Login with wrong password → `401`
- Access protected route without token → `401`

### RBAC

- Customer calls `POST /api/products` → `403`
- Admin-only endpoints reject non-admin users

### Cart

- Add non-existent product → `404`
- Add quantity higher than stock → `400`
- Add same product multiple times → quantity should increment
- Patch with quantity `0` removes item

### Orders / Checkout

- Place order with empty cart → `400`
- Place order with insufficient stock → `400`
- Successful checkout:
  - order created,
  - stock decremented,
  - cart cleared

### Cancellation / Status Rules

- Customer cancel outside allowed window → `400`
- Cancel shipped/delivered order → `400`
- Invalid status transitions (e.g. Pending → Delivered) → `400`
- Valid transitions:
  - Pending → Shipped
  - Shipped → Delivered
  - Pending → Cancelled

### Abuse / Block Logic

- Repeated cancellations trigger account block rule
- Blocked user should be denied protected routes (`403`)

---

## 3) Automated Tests (Jest + Supertest)

### What automated tests cover

Core integration coverage includes:

- Auth register/login returns JWT and never exposes password
- RBAC enforcement for admin-only product creation
- Transactional checkout behavior:
  - add to cart,
  - place order,
  - stock decreases,
  - cart clears

If you expanded tests, include additional scenarios such as:
- Admin signup key protection
- Status transition rules
- Blocked-user enforcement on protected routes

---

## 4) How to Run Tests

From project root:

```bash
npm install
npm test
```

---

## 5) Test Architecture Notes

- Tests run in isolated in-memory MongoDB replica set:
  - `mongodb-memory-server` with `MongoMemoryReplSet`
- Replica set is required because order placement uses Mongo transactions.
- Database is cleaned between tests to prevent cross-test contamination.

---

## 6) Debugging Failing Tests

### Common causes

- Missing env vars (`JWT_SECRET`, etc.)
- Token not passed in Authorization header
- Role mismatch (customer calling admin route)
- Endpoint path typos

### Useful checks

- Confirm response status + body error message
- Run tests with verbose output
- Re-run a single failing test while debugging

---

## 7) CI Recommendation (Optional but Strongly Recommended)

Use a CI workflow to run tests on every push/PR:

- `npm ci`
- `npm test`

This catches regressions in auth, RBAC, and checkout logic early.
