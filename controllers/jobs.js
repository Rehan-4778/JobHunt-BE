const asyncHandler = require("../middlewares/async");
const Job = require("../models/Job");
const JobApplication = require("../models/JobApplication");
const User = require("../models/User");
const ErrorResponse = require("../utils/errorResponse");

// Create a new job (Employer only)
const createJob = asyncHandler(async (req, res, next) => {
  const jobData = {
    ...req.body,
    employer: req.user.id,
  };

  if (typeof jobData.skillsRequired === "string") {
    jobData.skillsRequired = jobData.skillsRequired.split(",");
  }

  const job = await Job.create(jobData);
  console.log(job);

  const populatedJob = await Job.findById(job._id).populate(
    "employer",
    "name email company"
  );

  res.status(201).json({
    success: true,
    message: "Job created successfully",
    data: populatedJob,
  });
});

const getAllJobs = asyncHandler(async (req, res, next) => {
  const isAdmin = req.user?.role === "admin";

  const filters = {};

  // Status filter
  if (!isAdmin) {
    filters.status = "Active";
  } else if (req.query.status) {
    filters.status = req.query.status;
  }

  // Basic filters
  if (req.query.category) filters.category = req.query.category;
  if (req.query.jobType) filters.jobType = req.query.jobType;
  if (req.query.location)
    filters.location = new RegExp(req.query.location, "i");

  // Additional filters
  if (req.query.experienceLevel) filters.experienceLevel = req.query.experienceLevel;
  if (req.query.gender) filters.gender = req.query.gender;

  // Salary filter - supports range format "min-max" or exact value
  if (req.query.salary) {
    filters.salary = new RegExp(req.query.salary, "i");
  }

  // Age filter - supports range format or exact value
  if (req.query.age) {
    filters.age = new RegExp(req.query.age, "i");
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const pageSize = parseInt(req.query.pageSize, 10) || 10;
  const skip = (page - 1) * pageSize;

  // Get total count for pagination metadata
  const total = await Job.countDocuments(filters);

  const jobs = await Job.find(filters)
    .populate("employer", "name email company")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize);

  res.status(200).json({
    success: true,
    jobs,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasMore: page * pageSize < total,
    },
  });
});

// Get employer's own jobs (Employer only)
const getMyJobs = asyncHandler(async (req, res, next) => {
  const filters = { employer: req.user._id };
  if (req.query.status) filters.status = req.query.status;

  const jobs = await Job.find(filters)
    .populate("employer", "name email company")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    jobs,
  });
});

// Get employer statistics (Employer only)
const getEmployerStats = asyncHandler(async (req, res, next) => {
  const employerId = req.user._id;

  // Get all jobs by this employer
  const jobs = await Job.find({ employer: employerId });
  const jobIds = jobs.map(job => job._id);

  // Get total jobs count
  const totalJobs = jobs.length;

  // Get all applications for employer's jobs
  const applications = await JobApplication.find({ job: { $in: jobIds } });

  // Calculate stats
  const totalApplicants = applications.length;
  const shortlisted = applications.filter(app => app.status === 'shortlisted').length;
  const hired = applications.filter(app => app.status === 'hired').length;

  res.status(200).json({
    success: true,
    stats: {
      jobsPosted: totalJobs,
      applicants: totalApplicants,
      shortlisted: shortlisted,
      hired: hired,
    },
  });
});

// Get single job by ID (Public)
const getJobById = asyncHandler(async (req, res, next) => {
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
});

// Update job (Employer - own jobs only)
const updateJob = async (req, res, next) => {
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
const updateJobStatus = async (req, res, next) => {
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
const deleteJob = asyncHandler(async (req, res, next) => {
  const job = await Job.findById(req.params.id);

  if (!job) {
    return next(new ErrorResponse("Job not found", 404));
  }

  if (
    req.user.role === "employer" &&
    job.employer.toString() !== req.user._id.toString()
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
});

// Save a job (User only)
const saveJob = asyncHandler(async (req, res, next) => {
  const jobId = req.params.id;

  const job = await Job.findById(jobId);
  if (!job) {
    return next(new ErrorResponse("Job not found", 404));
  }

  const user = await User.findById(req.user.id);

  // Check if job is already saved
  if (user.savedJobs && user.savedJobs.includes(jobId)) {
    return res.status(200).json({
      success: true,
      message: "Job already saved",
    });
  }

  // Use findByIdAndUpdate to avoid validation issues
  await User.findByIdAndUpdate(
    req.user.id,
    { $addToSet: { savedJobs: jobId } },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: "Job saved successfully",
  });
});

// Unsave a job (User only)
const unsaveJob = asyncHandler(async (req, res, next) => {
  const jobId = req.params.id;

  // Use findByIdAndUpdate to avoid validation issues
  await User.findByIdAndUpdate(
    req.user.id,
    { $pull: { savedJobs: jobId } },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: "Job unsaved successfully",
  });
});

// Get saved jobs (User only)
const getSavedJobs = asyncHandler(async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return next(new ErrorResponse("User not found", 404));
    }

    // Handle case where savedJobs doesn't exist on user
    if (!user.savedJobs || user.savedJobs.length === 0) {
      return res.status(200).json({
        success: true,
        jobs: [],
      });
    }

    // Fetch the saved jobs with employer populated
    const jobs = await Job.find({ _id: { $in: user.savedJobs } })
      .populate("employer", "name email company")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      jobs: jobs || [],
    });
  } catch (error) {
    console.error("getSavedJobs error:", error);
    return next(new ErrorResponse("Failed to fetch saved jobs", 500));
  }
});

module.exports = {
  createJob,
  getAllJobs,
  getMyJobs,
  getEmployerStats,
  getJobById,
  updateJob,
  updateJobStatus,
  deleteJob,
  saveJob,
  unsaveJob,
  getSavedJobs,
};
