# Testing Guide (Manual + Automated)

This project includes:
- A Postman collection for quick manual testing
- Minimal integration tests (Jest + Supertest) to validate core flows:
  1) Auth (register/login)
  2) RBAC (admin-only product creation)
  3) Transactional checkout (cart → order → stock decrement)

---

## 1) Manual Testing (Postman)

### Prerequisites
- API running locally OR deployed
- MongoDB accessible (Atlas/local)

### Recommended manual testing order
1. Register Admin
2. Admin Login
3. Create Product (Admin)
4. Register User
5. User Login
6. Add To Cart
7. Get Cart
8. Place Order
9. Get My Orders
10. Cancel Order (try Pending)
11. Admin Update Status (Pending → Shipped → Delivered)

### Manual edge cases to verify
#### Auth
- Register same email twice → 400
- Login with wrong password → 401
- Try protected routes without JWT → 401

#### RBAC
- Customer calls POST /products → 403

#### Cart
- Add non-existent product → 404
- Add quantity > stock → 400
- Add same product twice → quantity increments

#### Orders
- Place order with empty cart → 400
- Place order when stock is insufficient → 400
- Confirm stock decreases after successful order
- Confirm cart clears after successful order

#### Cancel / Fraud Prevention
- Cancel same order twice → 400
- Cancel shipped/delivered → 400
- Cancel repeatedly (4+ times) → user becomes blocked (isBlocked=true)
- Confirm blocked user cannot login (or cannot use protected routes depending on implementation)

---

## 2) Automated Tests (Jest)

### What is covered
- Auth register/login returns JWT and hides password
- Admin can create product; customer cannot
- Transactional checkout clears cart and decrements stock

### How to run
```bash
npm install
npm test
