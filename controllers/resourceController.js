const Resource = require("../models/Resource");
const User = require("../models/user");
const { sendEmail } = require("../config/email");
const {
  resourceApprovedEmail,
  resourceRejectedEmail,
  newResourceSubmissionEmail,
} = require("../utils/emailTemplates");
const { deleteFileFromSupabase } = require("../config/supabaseConfig");

// Upload new resource (verified users only)
const uploadResource = async (req, res) => {
  try {
    const {
      courseName,
      title,
      description,
      resourceType,
      department,
      semester,
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

    if (!req.user.isVerified) {
      return res.status(403).json({
        success: false,
        message:
          "Only verified users can upload resources. Please verify your email first.",
      });
    }

    const isAdmin = req.user.role === "admin";
    const status = isAdmin ? "approved" : "pending";

    const resource = await Resource.create({
      courseName,
      title,
      description,
      resourceType,
      department,
      semester,
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
      status: status,
      ...(isAdmin && {
        reviewedBy: req.user._id,
        reviewedAt: Date.now(),
      }),
    });

    const admins = await User.find({ role: "admin" });

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
            semester
          ),
        });
      }
    }

    const successMessage = isAdmin
      ? "Resource uploaded and automatically approved!"
      : "Resource uploaded successfully! It will be available after admin approval.";

    res.status(201).json({
      success: true,
      message: successMessage,
      resource,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to upload resource",
      error: error.message,
    });
  }
};

// Get approved resources with filters
const getResources = async (req, res) => {
  try {
    const { search, year, resourceType, section, batch, department, semester } =
      req.query;

    let query = { status: "approved" };

    if (department && department !== "All") {
      query.department = department;
    }
    if (semester && semester !== "All") {
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

    if (search) {
      query.$or = [
        { courseName: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
        { semester: { $regex: search, $options: "i" } },
      ];
    }

    const resources = await Resource.find(query)
      .populate("uploadedBy", "fullName email")
      .sort({ createdAt: -1 });

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
    res.status(500).json({
      success: false,
      message: "Failed to fetch resources",
      error: error.message,
    });
  }
};

// Get user's own resources
const getMyResources = async (req, res) => {
  try {
    const resources = await Resource.find({ uploadedBy: req.user._id }).sort({
      createdAt: -1,
    });

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
    res.status(500).json({
      success: false,
      message: "Failed to fetch your resources",
      error: error.message,
    });
  }
};

// Delete resource and associated file
const deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    if (
      resource.uploadedBy.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this resource",
      });
    }

    if (resource.fileUrl) {
      await deleteFileFromSupabase(resource.fileUrl);
    }

    await resource.deleteOne();

    res.status(200).json({
      success: true,
      message: "Resource and file deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete resource",
      error: error.message,
    });
  }
};

// Get pending resources (admin only)
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
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending resources",
      error: error.message,
    });
  }
};

// Approve resource (admin only)
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
    res.status(500).json({
      success: false,
      message: "Failed to approve resource",
      error: error.message,
    });
  }
};

// Reject resource and delete file (admin only)
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

    if (resource.fileUrl) {
      await deleteFileFromSupabase(resource.fileUrl);
    }

    resource.status = "rejected";
    resource.rejectionReason = reason;
    resource.reviewedBy = req.user._id;
    resource.reviewedAt = Date.now();
    await resource.save();

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
    res.status(500).json({
      success: false,
      message: "Failed to reject resource",
      error: error.message,
    });
  }
};

// Increment download count
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
    res.status(500).json({
      success: false,
      message: "Failed to update download count",
      error: error.message,
    });
  }
};

// Increment view count
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
    res.status(500).json({
      success: false,
      message: "Failed to update view count",
      error: error.message,
    });
  }
};

// Get all resources for admin dashboard
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
    res.status(500).json({
      success: false,
      message: "Failed to fetch resources",
      error: error.message,
    });
  }
};

// Get resource counts by department and semester
const getResourceCounts = async (req, res) => {
  try {
    const { department, semester } = req.query;

    if (!department || !semester) {
      return res.status(400).json({
        success: false,
        message: "Department and semester are required",
      });
    }

    const counts = await Resource.aggregate([
      {
        $match: {
          department: department,
          semester: semester,
          status: "approved",
        },
      },
      {
        $group: {
          _id: "$resourceType",
          count: { $sum: 1 },
        },
      },
    ]);

    const countObject = {};
    counts.forEach((item) => {
      countObject[item._id] = item.count;
    });

    res.status(200).json({
      success: true,
      counts: countObject,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching resource counts",
      error: error.message,
    });
  }
};

module.exports = {
  uploadResource,
  getResources,
  getMyResources,
  deleteResource,
  getPendingResources,
  approveResource,
  rejectResource,
  incrementDownload,
  incrementView,
  getAllResourcesAdmin,
  getResourceCounts,
};
