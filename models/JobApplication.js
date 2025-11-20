const mongoose = require("mongoose");

const JobApplicationSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Job",
    required: true,
  },
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  firstName: {
    type: String,
    required: [true, "Please add first name"],
  },
  lastName: {
    type: String,
    required: [true, "Please add last name"],
  },
  cnic: {
    type: String,
    required: [true, "Please add CNIC"],
  },
  city: {
    type: String,
    required: [true, "Please add city"],
  },
  country: {
    type: String,
    required: [true, "Please add country"],
  },
  address: {
    type: String,
    required: [true, "Please add address"],
  },
  experience: {
    type: String,
    required: [true, "Please select experience level"],
    enum: ["fresher", "1-2 years", "3-5 years", "5-10 years", "10+ years"],
  },
  expectedSalary: {
    type: String,
    required: [true, "Please add expected salary"],
  },
  cvUrl: {
    type: String,
    required: [true, "Please upload CV"],
  },
  status: {
    type: String,
    enum: ["pending", "reviewed", "shortlisted", "rejected", "hired"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Prevent duplicate applications for same job by same user
JobApplicationSchema.index({ job: 1, applicant: 1 }, { unique: true });

module.exports = mongoose.model("JobApplication", JobApplicationSchema);
