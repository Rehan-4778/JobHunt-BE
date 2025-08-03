const express = require("express");
const {
  createCategory,
  getAllCategories,
  getActiveCategories,
  getCategoryById,
  updateCategory,
  toggleCategoryStatus,
  deleteCategory,
  getJobsByCategory,
} = require("../controllers/categories");

const { protect, authorize } = require("../middlewares/auth");

const router = express.Router();

// Public routes
router.get("/", getAllCategories); // Get all categories
router.get("/active", getActiveCategories); // Get only active categories
router.get("/:id", getCategoryById); // Get single category
router.get("/:id/jobs", getJobsByCategory); // Get jobs in category

// Protected routes
router.use(protect);

// Admin routes
router.post("/", authorize("admin"), createCategory); // Create category
router.put("/:id", authorize("admin"), updateCategory); // Update category
router.patch("/:id/toggle", authorize("admin"), toggleCategoryStatus); // Toggle active/inactive
router.delete("/:id", authorize("admin"), deleteCategory); // Delete category

module.exports = router;
