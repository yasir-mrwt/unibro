const Staff = require("../models/Staff");
const { deleteStaffImage } = require("../config/supabaseConfig"); // ADD THIS IMPORT

// @desc    Get all staff with pagination and search
// @route   GET /api/staff
// @access  Public
const getAllStaff = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 6,
      search = "",
      department = "",
      sortBy = "name",
    } = req.query;

    // Build query - REMOVED isActive filter for hard delete
    let query = {};

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
        { courses: { $regex: search, $options: "i" } },
        { qualification: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by department
    if (department) {
      query.department = department;
    }

    // Calculate skip value for pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get total count for pagination
    const total = await Staff.countDocuments(query);

    // Get staff with pagination
    const staff = await Staff.find(query)
      .sort(sortBy)
      .limit(parseInt(limit))
      .skip(skip);

    res.status(200).json({
      success: true,
      data: staff,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalStaff: total,
        hasMore: skip + staff.length < total,
      },
    });
  } catch (error) {
    console.error("Get all staff error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching staff",
      error: error.message,
    });
  }
};

// @desc    Get single staff member
// @route   GET /api/staff/:id
// @access  Public
const getStaffById = async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    res.status(200).json({
      success: true,
      data: staff,
    });
  } catch (error) {
    console.error("Get staff by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching staff member",
      error: error.message,
    });
  }
};

// @desc    Create new staff member
// @route   POST /api/staff
// @access  Private/Admin
const createStaff = async (req, res) => {
  try {
    const staffData = req.body;

    // Check if staff with this email already exists
    const existingStaff = await Staff.findOne({ email: staffData.email });

    if (existingStaff) {
      return res.status(400).json({
        success: false,
        message: "A staff member with this email already exists",
      });
    }

    // Create new staff
    const staff = await Staff.create(staffData);

    res.status(201).json({
      success: true,
      message: "Staff member created successfully",
      data: staff,
    });
  } catch (error) {
    // Handle duplicate key error specifically
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A staff member with this email already exists",
      });
    }

    console.error("Create staff error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating staff member",
      error: error.message,
    });
  }
};

// @desc    Update staff member
// @route   PUT /api/staff/:id
// @access  Private/Admin
const updateStaff = async (req, res) => {
  try {
    const staff = await Staff.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Staff member updated successfully",
      data: staff,
    });
  } catch (error) {
    console.error("Update staff error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating staff member",
      error: error.message,
    });
  }
};

// @desc    Delete staff member PERMANENTLY (hard delete from MongoDB + Cloud)
// @route   DELETE /api/staff/:id
// @access  Private/Admin
const deleteStaff = async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    // Delete image from cloud storage if exists
    if (staff.image && staff.image.includes("supabase.co")) {
      try {
        console.log("🗑️ Deleting staff image from cloud:", staff.image);

        // Extract storage path from URL
        const url = new URL(staff.image);
        const pathParts = url.pathname.split("/staff-profiles/");
        if (pathParts.length > 1) {
          const storagePath = `staff-profiles/${pathParts[1]}`;
          console.log("📁 Extracted storage path:", storagePath);

          // Delete from Supabase cloud storage
          const deleteResult = await deleteStaffImage(storagePath);

          if (!deleteResult.success) {
            console.error(
              "❌ Failed to delete image from cloud:",
              deleteResult.error
            );
            // Continue with database deletion even if cloud delete fails
          } else {
            console.log("✅ Staff image deleted from cloud successfully");
          }
        }
      } catch (cloudError) {
        console.error("❌ Cloud deletion error:", cloudError);
        // Continue with database deletion even if cloud delete fails
      }
    }

    // PERMANENTLY DELETE from MongoDB database (hard delete)
    await Staff.findByIdAndDelete(req.params.id);
    console.log("✅ Staff member permanently deleted from database");

    res.json({
      success: true,
      message:
        "Staff member permanently deleted from both database and cloud storage",
    });
  } catch (error) {
    console.error("❌ Delete staff error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete staff member",
      error: error.message,
    });
  }
};

// @desc    Get all departments
// @route   GET /api/staff/departments
// @access  Public
const getDepartments = async (req, res) => {
  try {
    // REMOVED isActive filter since we're doing hard delete
    const departments = await Staff.distinct("department");

    res.status(200).json({
      success: true,
      data: departments,
    });
  } catch (error) {
    console.error("Get departments error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching departments",
      error: error.message,
    });
  }
};

module.exports = {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  getDepartments,
};
