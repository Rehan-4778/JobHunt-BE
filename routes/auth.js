const express = require("express");
const router = express.Router();

const {
  register,
  login,
  getMe,
  updateDetails,
  updatePassword,
  forgetPassword,
  resetPassword,
  logout,
  getPendingApplications,
  approveUser,
} = require("../controllers/auth");
const { protect, authorize } = require("../middlewares/auth");
const { upload, handleUploadError } = require("../middlewares/cvUpload");

router.route("/register").post(upload.single("cv"), handleUploadError, register);
router.route("/login").post(login);
router.route("/me").get(protect, getMe);
router.route("/updatedetails").put(protect, updateDetails);
router.route("/updatepassword").put(protect, updatePassword);
router.route("/forgetpassword").post(forgetPassword);
router.route("/resetpassword/:resettoken").put(resetPassword);
router.route("/logout").get(logout);
router.route("/pending-applications").get(protect, authorize("admin"), getPendingApplications);
router.route("/approve/:id").patch(protect, authorize("admin"), approveUser);

module.exports = router;
