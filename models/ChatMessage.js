const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    // Chat room identifier (department + semester)
    roomId: {
      type: String,
      required: true,
      index: true,
      // Format: "department_semester" e.g., "Computer Science_3"
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    semester: {
      type: String,
      required: true,
      trim: true,
    },
    // Message content
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    // User who sent the message
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    // Message type (text, image, file, etc.)
    messageType: {
      type: String,
      enum: ["text", "image", "file"],
      default: "text",
    },
    // For file/image messages
    fileUrl: {
      type: String,
      default: null,
    },
    fileName: {
      type: String,
      default: null,
    },
    // Reply to another message
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatMessage",
      default: null,
    },
    // Message status
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    // Read receipts
    readBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Index for fast queries
chatMessageSchema.index({ roomId: 1, createdAt: -1 });
chatMessageSchema.index({ userId: 1, createdAt: -1 });
chatMessageSchema.index({ department: 1, semester: 1, createdAt: -1 });

// Virtual for formatted time
chatMessageSchema.virtual("formattedTime").get(function () {
  const now = new Date();
  const msgTime = this.createdAt;
  const diff = now - msgTime;

  // Less than 1 minute
  if (diff < 60000) {
    return "Just now";
  }
  // Less than 1 hour
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return `${mins}m ago`;
  }
  // Less than 24 hours
  if (diff < 86400000) {
    return msgTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  // More than 24 hours
  return msgTime.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
});

// Ensure virtuals are included in JSON
chatMessageSchema.set("toJSON", { virtuals: true });
chatMessageSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
