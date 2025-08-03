const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    position: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    jobType: {
      type: String,
      required: true,
      enum: ["Full-time", "Part-time", "Contract", "Internship", "Freelance"],
    },
    experienceLevel: {
      type: String,
      required: true,
      enum: ["Entry Level", "Junior", "Mid Level", "Senior", "Executive"],
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },

    educationLevel: {
      type: String,
      required: true,
      enum: [
        "High School",
        "Bachelor's Degree",
        "Master's Degree",
        "PhD",
        "Diploma",
        "Certificate",
      ],
    },
    salary: {
      type: String,
      required: true,
      trim: true,
    },
    age: {
      type: String,
      required: true,
      trim: true,
    },
    gender: {
      type: String,
      required: true,
      enum: ["Male", "Female", "Any", "Prefer not to say"],
    },

    requirements: {
      type: String,
      required: true,
      trim: true,
    },
    benefits: {
      type: String,
      required: true,
      trim: true,
    },
    skillsRequired: [
      {
        type: String,
        required: true,
      },
    ],
    applicationDeadline: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["Active", "Closed", "Draft", "Paused", "Expired"],
      default: "Active",
    },

    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    applicationsCount: {
      type: Number,
      default: 0,
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Job = mongoose.model("Job", jobSchema);

module.exports = Job;
