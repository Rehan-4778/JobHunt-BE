const User = require("../models/User");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middlewares/async");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");

// @description       Register user
// @route             POST  api/v1/auth/register
// @access            Public
exports.register = asyncHandler(async (req, res, next) => {
  // Check for file validation errors
  if (req.fileValidationError) {
    return next(new ErrorResponse(req.fileValidationError, 400));
  }

  // create user
  const { 
    firstName, 
    lastName, 
    email, 
    mobileNo, 
    address, 
    city, 
    password, 
    role 
  } = req.body;

  console.log('Request body:', req.body);
  console.log('Uploaded file:', req.file);

  // Check if CV is required for job seekers
  if (role === "user" && !req.file) {
    return next(new ErrorResponse("CV is required for job seekers", 400));
  }

  // Prepare user data
  const userData = {
    firstName,
    lastName,
    email,
    mobileNo,
    address,
    city,
    password,
    role,
  };

  // Add CV URL if file was uploaded
  if (req.file) {
    userData.cvUrl = req.file.path;
  }

  const user = await User.create(userData);

  // send token response
  sendTokenResponse(user, 200, res);
});

// @description       Login user
// @route             POST  api/v1/auth/login
// @access            Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // validate email and password
  if (!email || !password) {
    return next(new ErrorResponse("Please provide an email and password", 400));
  }

  // check for user
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(new ErrorResponse("Invalid credentials", 401));
  }

  // check if password matches
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return next(new ErrorResponse("Invalid credentials", 401));
  }

  // check if user is approved
  if (user.role !== "admin" && !user.isApproved) {
    return next(new ErrorResponse("Your application is pending approval from admin. Please wait for approval.", 403));
  }

  // send token response
  sendTokenResponse(user, 200, res);
});

// @description       Update user details
// @route             PUT  api/v1/auth/updatedetails
// @access            Private
exports.updateDetails = asyncHandler(async (req, res, next) => {
  // get user from database
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email,
  };

  // update user
  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    return next(new ErrorResponse("User not found", 404));
  }
  // send response
  res.status(200).json({ success: true, data: user });
});

// @description       Update password
// @route             PUT  api/v1/auth/updatepassword
// @access            Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
  // get user from database
  const user = await User.findById(req.user.id).select("+password");

  // check current password
  if (!(await user.matchPassword(req.body.currentPassword))) {
    return next(new ErrorResponse("Password is incorrect", 401));
  }

  // update password
  user.password = req.body.newPassword;
  await user.save();

  // send token response
  sendTokenResponse(user, 200, res);
});

// @description       Get current logged in user
// @route             POST  api/v1/auth/me
// @access            Private
exports.getMe = asyncHandler(async (req, res, next) => {
  // get user from database
  const user = await User.findById(req.user.id);

  // send response
  res.status(200).json({ success: true, data: user });
});

// description       Forget password
// route             POST  api/v1/auth/forgetpassword
// access            Public
exports.forgetPassword = asyncHandler(async (req, res, next) => {
  // get user from database
  const user = await User.findOne({ email: req.body.email });

  // check if user exists
  if (!user) {
    return next(new ErrorResponse("There is no user with that email", 404));
  }
  // get reset token
  const resetToken = user.getResetPasswordToken();
  // save user
  await user.save({ validateBeforeSave: false });

  // email details
  const resetUrl = `${req.protocol}://${req.get(
    "host"
  )}/redirect/reset-password/${resetToken}`;

  const htmlMessage = `
    <p>You requested a password reset.</p>
    <p>Tap the link below to open the app and reset your password:</p>
    <a href="${resetUrl}">Reset Password</a>
  `;
  // send email
  try {
    await sendEmail({
      email: user.email,
      subject: "Reset Password",
      html: htmlMessage,
    });

    res
      .status(200)
      .json({ success: true, data: "Reset link sent to your email." });
  } catch (error) {
    console.log(error);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new ErrorResponse("Email could not be sent", 500));
  }
});

// @description       Reset password
// @route             PUT  api/v1/auth/resetpassword/:resettoken
// @access            Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
  // get hashed token
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.resettoken)
    .digest("hex");

  // get user from database
  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  // check if user exists
  if (!user) {
    return next(new ErrorResponse("Invalid token", 400));
  }

  // set new password
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  // save user
  await user.save();

  // send token response
  sendTokenResponse(user, 200, res);
});

// @description       Log user out / clear cookie
// @route             GET  api/v1/auth/logout
// @access            Private
exports.logout = asyncHandler(async (req, res, next) => {
  // set cookie to none
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000), // 10 seconds
    httpOnly: true,
  });

  // send response
  res.status(200).json({ success: true, data: {} });
});

// @description       Get all pending user applications (Admin only)
// @route             GET  api/v1/auth/pending-applications
// @access            Private (Admin only)
exports.getPendingApplications = asyncHandler(async (req, res, next) => {
  const pendingUsers = await User.find({ isApproved: false }).select("-password");

  res.status(200).json({
    success: true,
    count: pendingUsers.length,
    data: pendingUsers,
  });
});

// @description       Approve or reject user application (Admin only)
// @route             PATCH  api/v1/auth/approve/:id
// @access            Private (Admin only)
exports.approveUser = asyncHandler(async (req, res, next) => {
  console.log('ok -- ', req.body);
  const { isApproved } = req.body;
  const userId = req.params.id;

  console.log(req.body);
  console.log(req.params);

  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorResponse("User not found", 404));
  }

  // Update approval status
  user.isApproved = isApproved;
  await user.save();

  // send response
  res.status(200).json({ 
    success: true, 
    data: user,
    message: `User application ${isApproved ? 'approved' : 'rejected'} successfully`
  });
});

const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") {
    options.secure = true;
  }

  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.__v;

  // send response
  res
    .status(statusCode)
    .cookie("token", token, options)
    .json({ success: true, user: userObj, token });
};


