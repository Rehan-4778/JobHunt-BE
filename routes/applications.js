const express = require("express");
const {
  createApplication,
  getMyApplications,
  getAllApplications,
  getJobApplications,
  updateApplicationStatus,
  checkApplicationStatus,
} = require("../controllers/applications");

const { protect, authorize } = require("../middlewares/auth");

const router = express.Router();

// All routes are protected
router.use(protect);

// User routes (job seeker)
router.get("/my", authorize("user"), getMyApplications);
router.get("/check/:jobId", authorize("user"), checkApplicationStatus);
router.post("/:jobId", authorize("user"), createApplication);

// Employer routes
router.get("/", authorize("employer"), getAllApplications);
router.get("/job/:jobId", authorize("employer"), getJobApplications);
router.patch("/:id/status", authorize("employer"), updateApplicationStatus);

module.exports = router;
