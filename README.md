# Mini E-Commerce API

A robust, RESTful backend API for a mini e-commerce platform. This project simulates core online shopping features including authentication, product management, cart operations, and secure order processing.

Built with **Node.js**, **Express**, and **MongoDB**.

## 📌 Project Overview

This system is designed to handle high-concurrency e-commerce operations with a focus on **data consistency** and **fraud prevention**.

### Key Features
* **🔐 Authentication & Authorization:**
    * JWT-based secure authentication.
    * Role-Based Access Control (RBAC) for `Admin` and `Customer`.
* **📦 Product Management:**
    * Admin-only CRUD operations for products.
    * Real-time stock management.
* **🛍️ Cart & Orders:**
    * Persistent shopping cart stored in the database.
    * **Atomic Order Placement:** Uses MongoDB Transactions (ACID) to ensure stock is only deducted if the order is successfully created.
* **🛡️ Fraud Prevention:**
    * **Anti-Stock-Hoarding:** Implements throttling to prevent malicious users from repeatedly reserving stock via cancellations.
    * **Negative Inventory Protection:** Strict validation to ensure stock never drops below zero.

---

## 🛠️ Tech Stack

* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** MongoDB (Mongoose ODM)
* **Authentication:** JSON Web Tokens (JWT) & Bcrypt
* **Validation:** Express-Validator

---

## 📂 Project Structure

The project follows a modular **MVC (Model-View-Controller)** architecture to ensure scalability and maintainability.

```text
src/
├── config/           # Database connections & environment config
├── controllers/      # Business logic (Req/Res handling)
├── middleware/       # Auth, Error handling, & Role validation
├── models/           # Mongoose Schemas (User, Product, Cart, Order)
├── routes/           # API Endpoint definitions
├── utils/            # Reusable helper functions (Async wrappers, Custom Errors)
├── app.js            # Express app setup (Middleware wiring)
└── server.js         # Entry point (Server listener)

```

---

## 🚀 Getting Started

Follow these steps to set up the project locally.

### Prerequisites

* [Node.js](https://nodejs.org/) (v14+ recommended)
* [MongoDB](https://www.mongodb.com/try/download/community) (Local or Atlas)

### Installation

1. **Clone the repository:**
```bash
git clone [https://github.com/your-username/mini-ecommerce-api.git](https://github.com/your-username/mini-ecommerce-api.git)
cd mini-ecommerce-api

```


2. **Install dependencies:**
```bash
npm install

```


3. **Environment Configuration:**
Create a `.env` file in the root directory and add the following variables:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/mini-ecommerce
JWT_SECRET=your_super_secret_key_123
NODE_ENV=development

```


4. **Run the server:**
```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start

```



---

## 📖 API Documentation

### **Authentication**

* `POST /api/auth/register` - Register a new user (Admin/Customer).
* `POST /api/auth/login` - Login and receive a JWT token.

### **Products**

* `GET /api/products` - List all products.
* `POST /api/products` - Add a new product (Admin only).
* `PUT /api/products/:id` - Update product details (Admin only).
* `DELETE /api/products/:id` - Remove a product (Admin only).

### **Cart**

* `GET /api/cart` - View user's cart.
* `POST /api/cart` - Add item to cart.
* `DELETE /api/cart/:itemId` - Remove item from cart.

### **Orders**

* `POST /api/orders` - Place an order (Atomic Transaction).
* `GET /api/orders` - View order history.
* `PUT /api/orders/:id/cancel` - Cancel an order.

---

## 🧪 Testing

To run the test suite (if applicable):

```bash
npm test

```

## 📜 License

This project is open-source and available under the [MIT License](https://www.google.com/search?q=LICENSE).