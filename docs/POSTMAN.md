# Postman Usage Guide

This repository includes an updated Postman collection:

- `docs/postman/Mini E-Commerce API.postman_collection.json`

Use this guide to run the collection correctly and avoid false failures.

---

## 1) Import Collection

1. Open Postman.
2. Click **Import**.
3. Select: `docs/postman/Mini E-Commerce API.postman_collection.json`.
4. Open the imported collection.
5. Go to the **Variables** tab.

---

## 2) Set Collection Variables

### Required

- `baseUrl`

Examples:

Deployed:
```text
https://ecommerceapi-pg15.onrender.com/api
```

Local:
```text
http://localhost:5000/api
```

### Optional

- `adminSignupKey`

Use this only if your backend has `ADMIN_SIGNUP_KEY` enabled.  
If admin signup is disabled or key protection is not configured, admin register may return `403`.

### Auto-captured variables (from test scripts)

The collection automatically stores these after successful requests:

- `token_admin`
- `token_user`
- `adminEmail`
- `userEmail`
- `productId`
- `cartItemId`
- `orderId`

---

## 3) Recommended Execution Order

Use this order for a clean end-to-end run:

1. **Health Check**
2. **Register Admin (Protected)**
3. **Admin Login**
4. **Create Product (Admin)**
5. **Register User (Customer)**
6. **User Login**
7. **Add To Cart**
8. **Get My Cart**
9. **Place Order**
10. **My Order History**
11. **Cancel Order (Customer)** *(optional path)*
12. **Update Status (Admin) - Pending → Shipped**
13. **Update Status (Admin) - Shipped → Delivered**

---

## 4) Business Rules You Should Expect

### Auth / Role

- `POST /products`, `PUT /products/:id`, `DELETE /products/:id` are **admin-only**.
- Missing/invalid JWT on protected routes returns `401`.
- Wrong role returns `403`.

### Admin Signup Protection

If admin key protection is enabled:

- Admin registration requires a valid key via:
  - header: `x-admin-signup-key`
  - or body: `adminKey`
- Wrong/missing key => `403`.

### Cart Rules

- Adding same product again increments quantity.
- `PATCH /cart/:itemId` sets absolute quantity.
- Quantity `0` removes item.
- Stock is validated on cart update/add.

### Order Rules

- Checkout is transactional.
- On success:
  - stock decreases,
  - order is created,
  - cart is cleared.
- Customer cancel:
  - only `Pending`,
  - only within 1 hour.
- Shipped/Delivered cannot be cancelled by customer.
- Status transitions are enforced:
  - `Pending -> Shipped -> Delivered`
  - `Pending -> Cancelled`
  - invalid jumps are rejected.

### Anti-abuse

- Repeated customer cancellations increase `cancellationCount`.
- If cancellations exceed threshold, account can be blocked.
- Blocked users are denied protected route access.

---

## 5) Common Failure Cases

### `401 Unauthorized`

- Missing token
- Invalid/expired token
- Wrong token variable used

### `403 Forbidden`

- Customer hitting admin route
- Admin signup key missing/invalid
- User blocked due to abuse logic

### `400 Cart is empty`

- Tried `POST /orders` before adding cart items

### `400 Insufficient stock`

- Requested quantity exceeds available stock

### `400 Invalid status transition`

- Attempted disallowed order status jump (e.g. `Pending -> Delivered`)

---

## 6) IDs: What Each Route Expects

- Cart update/delete routes require **cart item ID** (`itemId`), not `productId`.
- Order routes require **order ID** (`orderId`).
- Product routes require **product ID** (`productId`).

---

## 7) Clean Re-run Tip

Before re-running full collection:

- Clear collection variables (`token_*`, `productId`, `cartItemId`, `orderId`)  
  **or**
- Use unique test emails each run.
