const express = require("express");
const {
  createJob,
  getAllJobs,
  getMyJobs,
  getJobById,
  updateJob,
  updateJobStatus,
  deleteJob,
  saveJob,
  unsaveJob,
  getSavedJobs,
} = require("../controllers/jobs");

const { protect, authorize } = require("../middlewares/auth");

const router = express.Router();

// Public routes (no authentication required)
router.get("/", getAllJobs); // Get all active jobs with pagination and filters

// User routes (job seeker) - must be before /:id to avoid route conflicts
router.get("/saved", protect, authorize("user"), getSavedJobs);
router.post("/:id/save", protect, authorize("user"), saveJob);
router.delete("/:id/save", protect, authorize("user"), unsaveJob);

// Employer routes
router.post("/", protect, authorize("employer"), createJob);
router.get("/my/jobs", protect, authorize("employer"), getMyJobs);
router.put("/:id", protect, authorize("employer"), updateJob);
router.patch("/:id/status", protect, authorize("employer"), updateJobStatus);
router.delete("/:id", protect, authorize("admin", "employer"), deleteJob);

// Public route with dynamic ID (must be last to avoid catching other routes)
router.get("/:id", getJobById); // Get single job by ID

module.exports = router;
