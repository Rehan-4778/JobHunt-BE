const ErrorResponse = require("../utils/errorResponse");
const Job = require("../models/Job");

// Create a new job (Employer only)
const createJob = async (req, res) => {
  try {
    const jobData = {
      ...req.body,
      employer: req.user.id,
    };

    if (typeof jobData.skillsRequired === "string") {
      jobData.skillsRequired = jobData.skillsRequired.split(",");
    }

    const job = await Job.create(jobData);

    const populatedJob = await Job.findById(job._id).populate(
      "employer",
      "name email company"
    );

    res.status(201).json({
      success: true,
      message: "Job created successfully",
      data: populatedJob,
    });
  } catch (error) {
    return next(new ErrorResponse("Something went wrong!", 500));
  }
};

const getAllJobs = async (req, res, next) => {
  try {
    const isAdmin = req.user?.role === "admin";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filters = {};

    if (!isAdmin) {
      filters.status = "Active";
    } else if (req.query.status) {
      filters.status = req.query.status;
    }

    if (req.query.category) filters.category = req.query.category;
    if (req.query.jobType) filters.jobType = req.query.jobType;
    if (req.query.location)
      filters.location = new RegExp(req.query.location, "i");

    const jobs = await Job.find(filters)
      .populate("employer", "name email company")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Job.countDocuments(filters);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
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

// Get employer's own jobs (Employer only)
const getMyJobs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filters = { employer: req.user.id };
    if (req.query.status) filters.status = req.query.status;

    const jobs = await Job.find(filters)
      .populate("employer", "name email company")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Job.countDocuments(filters);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
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

// Get single job by ID (Public)
const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate(
      "employer",
      "name email company"
    );

    if (!job) {
      return next(new ErrorResponse("Job not found", 404));
    }

    job.viewsCount += 1;
    await job.save();

    res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error) {
    return next(new ErrorResponse("Something went wrong!", 500));
  }
};

// Update job (Employer - own jobs only)
const updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return next(new ErrorResponse("Job not found", 404));
    }

    if (job.employer.toString() !== req.user.id) {
      return next(
        new ErrorResponse("You don't have access to update this job", 403)
      );
    }

    if (
      req.body.skillsRequired &&
      typeof req.body.skillsRequired === "string"
    ) {
      req.body.skillsRequired = req.body.skillsRequired.split(",");
    }

    const updatedJob = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).populate("employer", "name email company");

    res.status(200).json({
      success: true,
      message: "Job updated successfully",
      data: updatedJob,
    });
  } catch (error) {
    return next(new ErrorResponse("Something went wrong!", 500));
  }
};

// Update job status (Employer - own jobs only)
const updateJobStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["Active", "Closed", "Draft", "Paused", "Expired"];

    if (!validStatuses.includes(status)) {
      return next(new ErrorResponse("Invalid status", 400));
    }

    const job = await Job.findById(req.params.id);

    if (!job) {
      return next(new ErrorResponse("Job not found", 404));
    }

    if (job.employer.toString() !== req.user.id) {
      return next(
        new ErrorResponse("You don't have access to update this job", 403)
      );
    }

    job.status = status;
    await job.save();

    res.status(200).json({
      success: true,
      message: "Job status updated successfully",
      data: { status: job.status },
    });
  } catch (error) {
    return next(new ErrorResponse("Something went wrong!", 500));
  }
};

// Delete job (Employer - own jobs, Admin - any job)
const deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return next(new ErrorResponse("Job not found", 404));
    }

    if (
      req.user.role === "employer" &&
      job.employer.toString() !== req.user.id
    ) {
      return next(
        new ErrorResponse("You don't have access to delete this job", 403)
      );
    }

    await Job.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Job deleted successfully",
    });
  } catch (error) {
    return next(new ErrorResponse("Something went wrong!", 500));
  }
};

module.exports = {
  createJob,
  getAllJobs,
  getMyJobs,
  getJobById,
  updateJob,
  updateJobStatus,
  deleteJob,
};
