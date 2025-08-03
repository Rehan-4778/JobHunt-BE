const Category = require("../models/Category");
const Job = require("../models/Job");

// Create a new category (Admin only)
const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category already exists",
      });
    }

    const category = await Category.create({
      name,
      description,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    return next(new ErrorResponse("Something went wrong!", 500));
  }
};

// Get all categories (Public)
const getAllCategories = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filters = {};
    if (req.query.isActive !== undefined) {
      filters.isActive = req.query.isActive === "true";
    }

    const categories = await Category.find(filters)
      .populate("createdBy", "name email")
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Category.countDocuments(filters);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        categories,
        currentPage: page,
        totalPages,
        totalCategories: total,
      },
    });
  } catch (error) {
    return next(new ErrorResponse("Something went wrong!", 500));
  }
};

// Get only active categories (Public)
const getActiveCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({
      name: 1,
    });

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    return next(new ErrorResponse("Something went wrong!", 500));
  }
};

// Get single category by ID (Public)
const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).populate(
      "createdBy",
      "name email"
    );

    if (!category) {
      return next(new ErrorResponse("Category not found", 404));
    }

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    return next(new ErrorResponse("Something went wrong!", 500));
  }
};

// Update category (Admin only)
const updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return next(new ErrorResponse("Category not found", 404));
    }

    // Check if new name already exists (if name is being changed)
    if (req.body.name && req.body.name !== category.name) {
      const existingCategory = await Category.findOne({ name: req.body.name });
      if (existingCategory) {
        return next(new ErrorResponse("Category name already exists", 400));
      }
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate("createdBy", "name email");

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: updatedCategory,
    });
  } catch (error) {
    return next(new ErrorResponse("Something went wrong!", 500));
  }
};

// Toggle category active/inactive (Admin only)
const toggleCategoryStatus = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return next(new ErrorResponse("Category not found", 404));
    }

    category.isActive = !category.isActive;
    await category.save();

    res.status(200).json({
      success: true,
      message: `Category ${
        category.isActive ? "activated" : "deactivated"
      } successfully`,
      data: {
        id: category._id,
        name: category.name,
        isActive: category.isActive,
      },
    });
  } catch (error) {
    return next(new ErrorResponse("Something went wrong!", 500));
  }
};

// Delete category (Admin only)
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return next(new ErrorResponse("Category not found", 404));
    }

    // Check if category has jobs
    const jobCount = await Job.countDocuments({ category: category.name });
    if (jobCount > 0) {
      return next(
        new ErrorResponse(
          `Cannot delete category. It has ${jobCount} job(s) associated with it.`,
          400
        )
      );
    }

    await Category.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    return next(new ErrorResponse("Something went wrong!", 500));
  }
};

// Get jobs by category (Public)
const getJobsByCategory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const category = await Category.findById(req.params.id);
    if (!category) {
      return next(new ErrorResponse("Category not found", 404));
    }

    // Get jobs in this category
    const jobs = await Job.find({
      category: category.name,
      status: "Active",
    })
      .populate("employer", "name email company")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Job.countDocuments({
      category: category.name,
      status: "Active",
    });
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        category: {
          id: category._id,
          name: category.name,
          description: category.description,
        },
        jobs,
        currentPage: page,
        totalPages,
        totalJobs: total,
      },
    });
  } catch (error) {
    return next(new ErrorResponse("Something went wrong!", 500));
  }
};

module.exports = {
  createCategory,
  getAllCategories,
  getActiveCategories,
  getCategoryById,
  updateCategory,
  toggleCategoryStatus,
  deleteCategory,
  getJobsByCategory,
};
