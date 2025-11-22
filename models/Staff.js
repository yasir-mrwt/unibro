const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    department: {
      type: String,
      required: [true, "Department is required"],
      enum: [
        "Computer Science",
        "Business Administration",
        "Engineering",
        "Mathematics",
        "Physics",
        "Chemistry",
        "English",
        "Economics",
        "Law",
        "Medicine",
      ],
    },
    image: {
      type: String,
      default:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
    },
    courses: [
      {
        type: String,
        trim: true,
      },
    ],
    qualification: {
      type: String,
      required: [true, "Qualification is required"],
    },
    office: {
      type: String,
      required: [true, "Office location is required"],
    },
    counsellingHours: {
      type: String,
      required: [true, "Counselling hours are required"],
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    bio: {
      type: String,
      maxlength: 500,
    },
    specialization: [
      {
        type: String,
      },
    ],
    yearsOfExperience: {
      type: Number,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "staffs",
  }
);

// Index for faster searches
staffSchema.index({ name: "text", department: "text", courses: "text" });

module.exports = mongoose.model("Staff", staffSchema);
