const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
    courseName: {
      type: String,
      required: [true, "Course name is required"],
      trim: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    resourceType: {
      type: String,
      required: [true, "Resource type is required"],
      enum: [
        "Assignments",
        "Quizzes",
        "Projects",
        "Presentations",
        "Notes",
        "Past Papers",
      ],
    },
    department: {
      type: String,
      required: [true, "Department is required"],
      trim: true,
    },
    semester: {
      type: String,
      required: [true, "Semester is required"],
      trim: true,
    },
    section: {
      type: String,
      required: [true, "Section is required"],
      trim: true,
    },
    batch: {
      type: String,
      required: [true, "Batch is required"],
      trim: true,
    },
    year: {
      type: Number,
      required: [true, "Year is required"],
    },
    // File information
    fileName: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    // NEW: Storage path for deletion
    storagePath: {
      type: String,
      default: null,
    },
    fileSize: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    pages: {
      type: Number,
      default: 0,
    },
    thumbnailUrl: {
      type: String,
      default: null,
    },
    // User who uploaded
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    uploaderName: {
      type: String,
      required: true,
    },
    uploaderEmail: {
      type: String,
      required: true,
    },
    // Approval status
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    // Admin who approved/rejected
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    // Download count
    downloadCount: {
      type: Number,
      default: 0,
    },
    // View count
    viewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for search functionality
resourceSchema.index({
  courseName: "text",
  title: "text",
  description: "text",
  department: "text",
  semester: "text",
});

// Method to increment download count
resourceSchema.methods.incrementDownload = function () {
  this.downloadCount += 1;
  return this.save();
};

// Method to increment view count
resourceSchema.methods.incrementView = function () {
  this.viewCount += 1;
  return this.save();
};

module.exports = mongoose.model("Resource", resourceSchema);
