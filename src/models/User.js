const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name']
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 6,
        select: false // Do not return password by default
    },
    role: {
        type: String,
        enum: ['customer', 'admin'],
        default: 'customer'
    },
    // 🛡️ Fraud Prevention Fields
    cancellationCount: {
        type: Number,
        default: 0
    },
    lastCancellationTime: {
        type: Date
    },
    isBlocked: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Pre-save hook: Hash password if modified
// FIXED: Removed 'next' parameter. Modern Mongoose handles async functions automatically.
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 12);
});

// Instance method: Check if password is correct
userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

module.exports = mongoose.model('User', userSchema);