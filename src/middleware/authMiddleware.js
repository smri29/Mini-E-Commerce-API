const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
    let token;

    // 1. Check if header exists
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        // Split 'Bearer <token>'
        token = req.headers.authorization.split(' ')[1];
    }

    // 2. Debugging Logs (Check your VS Code Terminal when you run this)
    console.log("---------------- AUTH DEBUG ----------------");
    console.log("1. Full Header:", req.headers.authorization);
    console.log("2. Extracted Token:", token);
    
    if (!token) {
        console.log("❌ Error: No token found");
        return next(new ApiError(401, 'Not authorized to access this route'));
    }

    try {
        // 3. Verify Token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("3. Decoded Payload:", decoded);

        // 4. Find User
        req.user = await User.findById(decoded.id);
        console.log("4. User Found:", req.user ? req.user.email : "No User");

        if (!req.user) {
             throw new Error("User not found in DB");
        }

        next();
    } catch (err) {
        console.log("❌ JWT Verification Failed:", err.message);
        return next(new ApiError(401, 'Not authorized to access this route'));
    }
});

module.exports = { protect };