const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 6,
      maxlength: 72, // bcrypt practical limit guard
      select: false
    },
    role: {
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer'
    },
    cancellationCount: {
      type: Number,
      default: 0,
      min: 0
    },
    lastCancellationTime: {
      type: Date
    },
    isBlocked: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: { versionKey: false },
    toObject: { versionKey: false }
  }
);

userSchema.pre('save', async function (next) {
  try {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    return next();
  } catch (err) {
    return next(err);
  }
});

userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
  return bcrypt.compare(candidatePassword, userPassword);
};

module.exports = mongoose.model('User', userSchema);
