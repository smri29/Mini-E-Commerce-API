```md
# Postman Usage Guide

This repo includes a Postman Collection JSON.

## 1) Import Collection
1. Open Postman
2. Import → select the collection JSON file
3. Open “Variables” tab of the collection

## 2) Set Variables

### Required
- `baseUrl`  
  Example (deployed):
https://ecommerceapi-pg15.onrender.com/api

Example (local):
http://localhost:5000/api


### Optional
- `adminSignupKey`
- Only needed if your backend requires a protected admin signup key
- If not enforced by backend, leaving it blank is fine.

### Auto-set variables (after running requests)
- `token_admin`
- `token_user`
- `productId`
- `cartItemId`
- `orderId`

These are captured automatically by Postman “Tests” scripts in the updated collection.

## 3) Correct Run Order (Recommended)
1. Health Check
2. Register Admin (Protected)
3. Admin Login
4. Create Product (Admin)
5. Register User
6. User Login
7. Add To Cart
8. Get My Cart
9. Place Order
10. My Order History
11. Cancel Order
12. Update Status (Admin)

## 4) Common Issues
### 401 Unauthorized
- Missing/invalid token
- Use the correct token:
- Admin-only endpoints require `token_admin`
- Customer endpoints use `token_user`

### 403 Forbidden
- RBAC violation (customer calling admin route)
- Admin signup blocked due to missing/wrong `adminSignupKey`

### 400 Cart is empty
- You tried placing an order before adding cart items

### 400 Insufficient stock
- Your cart quantity exceeds current product stock

## 5) Notes on IDs
- Cart removal requires `itemId` (the cart item _id), not productId.
- Order endpoints use `orderId`.
```