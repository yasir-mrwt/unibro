const Staff = require("../models/Staff");
const { deleteStaffImage } = require("../config/supabaseConfig");

// Get all staff with pagination and search
const getAllStaff = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 6,
      search = "",
      department = "",
      sortBy = "name",
    } = req.query;

    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
        { courses: { $regex: search, $options: "i" } },
        { qualification: { $regex: search, $options: "i" } },
      ];
    }

    if (department) {
      query.department = department;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Staff.countDocuments(query);

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
    res.status(500).json({
      success: false,
      message: "Error fetching staff",
      error: error.message,
    });
  }
};

// Get single staff member
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
    res.status(500).json({
      success: false,
      message: "Error fetching staff member",
      error: error.message,
    });
  }
};

// Create new staff member
const createStaff = async (req, res) => {
  try {
    const staffData = req.body;

    const existingStaff = await Staff.findOne({ email: staffData.email });

    if (existingStaff) {
      return res.status(400).json({
        success: false,
        message: "A staff member with this email already exists",
      });
    }

    const staff = await Staff.create(staffData);

    res.status(201).json({
      success: true,
      message: "Staff member created successfully",
      data: staff,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A staff member with this email already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error creating staff member",
      error: error.message,
    });
  }
};

// Update staff member
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
    res.status(500).json({
      success: false,
      message: "Error updating staff member",
      error: error.message,
    });
  }
};

// Delete staff member permanently (hard delete)
const deleteStaff = async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    if (staff.image && staff.image.includes("supabase.co")) {
      try {
        const url = new URL(staff.image);
        const pathParts = url.pathname.split("/staff-profiles/");
        if (pathParts.length > 1) {
          const storagePath = `staff-profiles/${pathParts[1]}`;
          await deleteStaffImage(storagePath);
        }
      } catch (cloudError) {
        // Continue with database deletion even if cloud delete fails
      }
    }

    await Staff.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Staff member permanently deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete staff member",
      error: error.message,
    });
  }
};

// Get all departments
const getDepartments = async (req, res) => {
  try {
    const departments = await Staff.distinct("department");

    res.status(200).json({
      success: true,
      data: departments,
    });
  } catch (error) {
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
