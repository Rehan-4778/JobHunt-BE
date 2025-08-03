const express = require("express");
const {
  createJob,
  getAllJobs,
  getMyJobs,
  getJobById,
  updateJob,
  updateJobStatus,
  deleteJob,
} = require("../controllers/jobs");

const { protect, authorize } = require("../middlewares/auth");

const router = express.Router();

router.use(protect);

router.get("/", authorize(["user", "admin"]), getAllJobs); // Get all active jobs (admin will also use this)
router.get("/:id", authorize(["user", "admin"]), getJobById);

router.post("/", authorize("employer"), createJob);
router.get("/my/jobs", authorize("employer"), getMyJobs);
router.put("/:id", authorize("employer"), updateJob);
router.patch("/:id/status", authorize("employer"), updateJobStatus);
router.delete("/:id", authorize(["user", "employer"]), deleteJob);

module.exports = router;
