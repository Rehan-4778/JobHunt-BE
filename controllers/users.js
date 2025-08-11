const asyncHandler = require("../middlewares/async");
const User = require("../models/User");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get users by role (user or employer)
// @route   GET /api/users/role/:role?search=&page=&limit=&sort=
// @access  Private/Admin
exports.getUsersByRole = asyncHandler(async (req, res, next) => {
  const { role } = req.params;
  const { search = "", page = 1, limit = 10, sort = "createdAt" } = req.query;

  // Validate role
  if (!["user", "employer"].includes(role)) {
    return next(new ErrorResponse("Invalid role type", 400));
  }

  const query = {
    role,
    $or: [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ],
  };

  const total = await User.countDocuments(query);
  const users = await User.find(query)
    .sort({ [sort]: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.status(200).json({
    success: true,
    count: users.length,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / limit),
    data: users,
  });
});

// @desc    Delete user by ID
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUserById = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse("User not found", 404));
  }

  await user.remove();

  res.status(200).json({
    success: true,
    message: "User deleted successfully",
  });
});
