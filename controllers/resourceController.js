const Resource = require("../models/resource");
const User = require("../models/user");
const { sendEmail } = require("../config/email");
const {
  resourceApprovedEmail,
  resourceRejectedEmail,
  newResourceSubmissionEmail,
} = require("../utils/emailTemplates");
const { deleteFileFromSupabase } = require("../config/supabaseConfig"); // ADD THIS

// @desc    Upload new resource (Verified users only)
// @route   POST /api/resources/upload
// @access  Private (Verified users)
const uploadResource = async (req, res) => {
  try {
    const {
      courseName,
      title,
      description,
      resourceType,
      department,
      semester, // ========== ADDED: Get semester from request ==========
      section,
      batch,
      year,
      fileName,
      fileUrl,
      fileSize,
      fileType,
      pages,
      thumbnailUrl,
    } = req.body;

    // Check if user is verified
    if (!req.user.isVerified) {
      return res.status(403).json({
        success: false,
        message:
          "Only verified users can upload resources. Please verify your email first.",
      });
    }

    // ========== NEW: Auto-approve if user is admin ==========
    const isAdmin = req.user.role === "admin";
    const status = isAdmin ? "approved" : "pending";
    // ========================================================

    // Create resource - INCLUDING DEPARTMENT AND SEMESTER
    const resource = await Resource.create({
      courseName,
      title,
      description,
      resourceType,
      department,
      semester, // ========== ADDED: Save semester with resource ==========
      section,
      batch,
      year,
      fileName,
      fileUrl,
      fileSize,
      fileType,
      pages: pages || 0,
      thumbnailUrl,
      uploadedBy: req.user._id,
      uploaderName: req.user.fullName,
      uploaderEmail: req.user.email,
      status: status, // ========== Auto-approved for admin ==========
      // Auto-set review info for admin uploads
      ...(isAdmin && {
        reviewedBy: req.user._id,
        reviewedAt: Date.now(),
      }),
    });

    // Get all admins to notify
    const admins = await User.find({ role: "admin" });

    // Send notification to all admins (only for non-admin uploads)
    if (!isAdmin) {
      for (const admin of admins) {
        await sendEmail({
          email: admin.email,
          subject: "New Resource Submitted for Approval - Unibro",
          html: newResourceSubmissionEmail(
            admin.fullName,
            req.user.fullName,
            title,
            courseName,
            resourceType,
            department,
            semester // ========== ADDED: Include semester in email ==========
          ),
        });
      }
    }

    // ========== MODIFIED: Different success message for admin ==========
    const successMessage = isAdmin
      ? "Resource uploaded and automatically approved!"
      : "Resource uploaded successfully! It will be available after admin approval.";

    res.status(201).json({
      success: true,
      message: successMessage,
      resource,
    });
  } catch (error) {
    console.error("Upload resource error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload resource",
      error: error.message,
    });
  }
};

// @desc    Get approved resources (with filters) - UPDATED with department and semester filtering
// @route   GET /api/resources
// @access  Public
const getResources = async (req, res) => {
  try {
    const { search, year, resourceType, section, batch, department, semester } =
      req.query; // ========== ADDED: semester ==========

    // Build query for approved resources only
    let query = { status: "approved" };

    // Add filters - DEPARTMENT AND SEMESTER
    if (department && department !== "All") {
      query.department = department;
    }
    if (semester && semester !== "All") {
      // ========== ADDED: Semester filter ==========
      query.semester = semester;
    }
    if (resourceType && resourceType !== "All") {
      query.resourceType = resourceType;
    }
    if (year && year !== "All") {
      query.year = parseInt(year);
    }
    if (section) {
      query.section = section;
    }
    if (batch) {
      query.batch = batch;
    }

    // Search functionality - UPDATED to include department and semester
    if (search) {
      query.$or = [
        { courseName: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
        { semester: { $regex: search, $options: "i" } }, // ========== ADDED: Search in semester ==========
      ];
    }

    const resources = await Resource.find(query)
      .populate("uploadedBy", "fullName email")
      .sort({ createdAt: -1 });

    // Group by year
    const groupedByYear = resources.reduce((acc, resource) => {
      const year = resource.year;
      if (!acc[year]) {
        acc[year] = [];
      }
      acc[year].push(resource);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      count: resources.length,
      resources: groupedByYear,
    });
  } catch (error) {
    console.error("Get resources error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch resources",
      error: error.message,
    });
  }
};

// @desc    Get user's own resources
// @route   GET /api/resources/my-posts
// @access  Private
const getMyResources = async (req, res) => {
  try {
    const resources = await Resource.find({ uploadedBy: req.user._id }).sort({
      createdAt: -1,
    });

    // Group by status
    const groupedByStatus = {
      pending: resources.filter((r) => r.status === "pending"),
      approved: resources.filter((r) => r.status === "approved"),
      rejected: resources.filter((r) => r.status === "rejected"),
    };

    res.status(200).json({
      success: true,
      count: resources.length,
      resources: groupedByStatus,
    });
  } catch (error) {
    console.error("Get my resources error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch your resources",
      error: error.message,
    });
  }
};

// @desc    Delete own resource - UPDATED to delete file from cloud
// @route   DELETE /api/resources/:id
// @access  Private
const deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    // Check if user owns this resource or is admin
    if (
      resource.uploadedBy.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this resource",
      });
    }

    // ========== DELETE FILE FROM SUPABASE CLOUD ==========
    if (resource.fileUrl) {
      const deleteResult = await deleteFileFromSupabase(resource.fileUrl);
      if (!deleteResult.success) {
        console.error("Failed to delete file from cloud:", deleteResult.error);
        // Continue anyway - we still delete the database record
      } else {
        console.log("File deleted from cloud successfully");
      }
    }
    // ====================================================

    await resource.deleteOne();

    res.status(200).json({
      success: true,
      message: "Resource and file deleted successfully",
    });
  } catch (error) {
    console.error("Delete resource error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete resource",
      error: error.message,
    });
  }
};

// @desc    Get pending resources (Admin only)
// @route   GET /api/resources/pending
// @access  Private/Admin
const getPendingResources = async (req, res) => {
  try {
    const resources = await Resource.find({ status: "pending" })
      .populate("uploadedBy", "fullName email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: resources.length,
      resources,
    });
  } catch (error) {
    console.error("Get pending resources error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending resources",
      error: error.message,
    });
  }
};

// @desc    Approve resource (Admin only)
// @route   PUT /api/resources/:id/approve
// @access  Private/Admin
const approveResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    if (resource.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Resource has already been reviewed",
      });
    }

    resource.status = "approved";
    resource.reviewedBy = req.user._id;
    resource.reviewedAt = Date.now();
    await resource.save();

    // Send approval email to uploader
    await sendEmail({
      email: resource.uploaderEmail,
      subject: "Your Resource Has Been Approved! 🎉 - Unibro",
      html: resourceApprovedEmail(
        resource.uploaderName,
        resource.title,
        resource.courseName
      ),
    });

    res.status(200).json({
      success: true,
      message: "Resource approved successfully",
      resource,
    });
  } catch (error) {
    console.error("Approve resource error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve resource",
      error: error.message,
    });
  }
};

// @desc    Reject resource (Admin only) - UPDATED to delete file from cloud
// @route   PUT /api/resources/:id/reject
// @access  Private/Admin
const rejectResource = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    if (resource.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Resource has already been reviewed",
      });
    }

    // ========== DELETE FILE FROM SUPABASE CLOUD ==========
    if (resource.fileUrl) {
      const deleteResult = await deleteFileFromSupabase(resource.fileUrl);
      if (!deleteResult.success) {
        console.error("Failed to delete file from cloud:", deleteResult.error);
        // Continue anyway - we still update the database
      } else {
        console.log("Rejected resource file deleted from cloud");
      }
    }
    // ====================================================

    resource.status = "rejected";
    resource.rejectionReason = reason;
    resource.reviewedBy = req.user._id;
    resource.reviewedAt = Date.now();
    await resource.save();

    // Send rejection email to uploader
    await sendEmail({
      email: resource.uploaderEmail,
      subject: "Resource Submission Update - Unibro",
      html: resourceRejectedEmail(
        resource.uploaderName,
        resource.title,
        resource.courseName,
        reason
      ),
    });

    res.status(200).json({
      success: true,
      message: "Resource rejected and file deleted",
      resource,
    });
  } catch (error) {
    console.error("Reject resource error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject resource",
      error: error.message,
    });
  }
};

// @desc    Increment download count
// @route   PUT /api/resources/:id/download
// @access  Public
const incrementDownload = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    await resource.incrementDownload();

    res.status(200).json({
      success: true,
      message: "Download count updated",
    });
  } catch (error) {
    console.error("Increment download error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update download count",
      error: error.message,
    });
  }
};

// @desc    Increment view count
// @route   PUT /api/resources/:id/view
// @access  Public
const incrementView = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    await resource.incrementView();

    res.status(200).json({
      success: true,
      message: "View count updated",
    });
  } catch (error) {
    console.error("Increment view error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update view count",
      error: error.message,
    });
  }
};

// @desc    Get all resources (Admin only - for dashboard)
// @route   GET /api/resources/admin/all
// @access  Private/Admin
const getAllResourcesAdmin = async (req, res) => {
  try {
    const { status } = req.query;

    let query = {};
    if (status && status !== "all") {
      query.status = status;
    }

    const resources = await Resource.find(query)
      .populate("uploadedBy", "fullName email")
      .populate("reviewedBy", "fullName email")
      .sort({ createdAt: -1 });

    const stats = {
      total: resources.length,
      pending: resources.filter((r) => r.status === "pending").length,
      approved: resources.filter((r) => r.status === "approved").length,
      rejected: resources.filter((r) => r.status === "rejected").length,
    };

    res.status(200).json({
      success: true,
      stats,
      resources,
    });
  } catch (error) {
    console.error("Get all resources error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch resources",
      error: error.message,
    });
  }
};

module.exports = {
  uploadResource,
  getResources,
  getMyResources,
  deleteResource, // Updated
  getPendingResources,
  approveResource,
  rejectResource, // Updated
  incrementDownload,
  incrementView,
  getAllResourcesAdmin,
};
