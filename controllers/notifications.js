const asyncHandler = require("../middlewares/async");
const Notification = require("../models/Notification");
const ErrorResponse = require("../utils/errorResponse");

// Get all notifications for logged-in user
const getNotifications = asyncHandler(async (req, res, next) => {
  const notifications = await Notification.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .limit(50);

  res.status(200).json({
    success: true,
    notifications,
  });
});

// Mark a notification as read
const markAsRead = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    return next(new ErrorResponse("Notification not found", 404));
  }

  // Check if notification belongs to user
  if (notification.user.toString() !== req.user.id) {
    return next(new ErrorResponse("Not authorized", 403));
  }

  notification.isRead = true;
  await notification.save();

  res.status(200).json({
    success: true,
    message: "Notification marked as read",
  });
});

// Mark all notifications as read
const markAllAsRead = asyncHandler(async (req, res, next) => {
  await Notification.updateMany(
    { user: req.user.id, isRead: false },
    { isRead: true }
  );

  res.status(200).json({
    success: true,
    message: "All notifications marked as read",
  });
});

// Get unread notification count
const getUnreadCount = asyncHandler(async (req, res, next) => {
  const count = await Notification.countDocuments({
    user: req.user.id,
    isRead: false,
  });

  res.status(200).json({
    success: true,
    count,
  });
});

// Delete a notification
const deleteNotification = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    return next(new ErrorResponse("Notification not found", 404));
  }

  // Check if notification belongs to user
  if (notification.user.toString() !== req.user.id) {
    return next(new ErrorResponse("Not authorized", 403));
  }

  await Notification.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Notification deleted",
  });
});

// Create notification (internal use - for other controllers)
const createNotification = async (userId, title, message, type = "general", data = {}) => {
  try {
    await Notification.create({
      user: userId,
      title,
      message,
      type,
      data,
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  createNotification,
};
