const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const UserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, "Please add a first name."],
  },
  lastName: {
    type: String,
    required: [true, "Please add a last name."],
  },
  email: {
    type: String,
    required: [true, "Please add an email."],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, // regex for email
      "Please add a valid email.",
    ],
  },
  cvUrl: {
    type: String,
    required: function () {
      return this.role === "user";
    },
  },
  isApproved: {
    type: Boolean,
    default: false,
  },
  role: {
    type: String,
    required: [true, "Please add a role"],
    enum: ["user", "admin", "employer"],
  },

  password: {
    type: String,
    required: [true, "Please add a password."],
    minlength: 4,
    select: false,
  },

  resetPasswordToken: String,
  resetPasswordExpire: Date,

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

UserSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

UserSchema.pre("remove", async function (next) {
  // Example: delete all jobs owned by this user
  await this.model("Job").deleteMany({ createdBy: this._id });
  next();
});

UserSchema.index({ role: 1 });
UserSchema.index({ isApproved: 1 });

module.exports = mongoose.model("User", UserSchema);
