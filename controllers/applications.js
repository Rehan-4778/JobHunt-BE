const asyncHandler = require("../middlewares/async");
const JobApplication = require("../models/JobApplication");
const Job = require("../models/Job");
const ErrorResponse = require("../utils/errorResponse");

// Create a new application (User only)
const createApplication = asyncHandler(async (req, res, next) => {
  const { jobId } = req.params;

  // Check if job exists
  const job = await Job.findById(jobId);
  if (!job) {
    return next(new ErrorResponse("Job not found", 404));
  }

  // Check if user already applied
  const existingApplication = await JobApplication.findOne({
    job: jobId,
    applicant: req.user.id,
  });

  if (existingApplication) {
    return next(new ErrorResponse("You have already applied for this job", 400));
  }

  const applicationData = {
    ...req.body,
    job: jobId,
    applicant: req.user.id,
  };

  const application = await JobApplication.create(applicationData);

  res.status(201).json({
    success: true,
    message: "Application submitted successfully",
    data: application,
  });
});

// Get my applications (User only)
const getMyApplications = asyncHandler(async (req, res, next) => {
  const applications = await JobApplication.find({ applicant: req.user.id })
    .populate({
      path: "job",
      select: "position location salary jobType experienceLevel category employer",
      populate: {
        path: "employer",
        select: "name email company",
      },
    })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    applications,
  });
});

// Get all applications for employer's jobs (Employer only)
const getAllApplications = asyncHandler(async (req, res, next) => {
  // Get all jobs posted by this employer
  const employerJobs = await Job.find({ employer: req.user.id }).select("_id");
  const jobIds = employerJobs.map((job) => job._id);

  // Get filter params
  const filter = { job: { $in: jobIds } };

  if (req.query.jobId) {
    filter.job = req.query.jobId;
  }

  if (req.query.status) {
    filter.status = req.query.status;
  }

  const applications = await JobApplication.find(filter)
    .populate("applicant", "firstName lastName email")
    .populate("job", "position location")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    applications,
  });
});

// Get applications for a specific job (Employer only)
const getJobApplications = asyncHandler(async (req, res, next) => {
  const { jobId } = req.params;

  // Check if job exists and belongs to employer
  const job = await Job.findById(jobId);
  if (!job) {
    return next(new ErrorResponse("Job not found", 404));
  }

  if (job.employer.toString() !== req.user.id) {
    return next(new ErrorResponse("Not authorized to view these applications", 403));
  }

  const applications = await JobApplication.find({ job: jobId })
    .populate("applicant", "firstName lastName email")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    applications,
  });
});

// Update application status (Employer only)
const updateApplicationStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ["pending", "reviewed", "shortlisted", "rejected", "hired"];
  if (!validStatuses.includes(status)) {
    return next(new ErrorResponse("Invalid status", 400));
  }

  const application = await JobApplication.findById(id).populate("job");

  if (!application) {
    return next(new ErrorResponse("Application not found", 404));
  }

  // Check if the job belongs to the employer
  if (application.job.employer.toString() !== req.user.id) {
    return next(new ErrorResponse("Not authorized to update this application", 403));
  }

  application.status = status;
  await application.save();

  res.status(200).json({
    success: true,
    message: "Application status updated successfully",
    data: application,
  });
});

// Check if user has applied for a job
const checkApplicationStatus = asyncHandler(async (req, res, next) => {
  const { jobId } = req.params;

  const application = await JobApplication.findOne({
    job: jobId,
    applicant: req.user.id,
  });

  res.status(200).json({
    success: true,
    hasApplied: !!application,
    application: application || null,
  });
});

module.exports = {
  createApplication,
  getMyApplications,
  getAllApplications,
  getJobApplications,
  updateApplicationStatus,
  checkApplicationStatus,
};
