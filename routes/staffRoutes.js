const express = require("express");
const router = express.Router();
const {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  getDepartments,
} = require("../controllers/staffController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Public routes
router.get("/", getAllStaff);
router.get("/departments", getDepartments);
router.get("/:id", getStaffById);

// Admin only routes
router.post("/", protect, authorize("admin"), createStaff);
router.put("/:id", protect, authorize("admin"), updateStaff);
router.delete("/:id", protect, authorize("admin"), deleteStaff);

module.exports = router;
