const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
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
} = require("../controllers/resourceController");

// Public routes
router.get("/", getResources); // Get approved resources with filters
router.put("/:id/download", incrementDownload); // Increment download count
router.put("/:id/view", incrementView); // Increment view count

// Protected routes (logged in users)
router.post("/upload", protect, uploadResource); // Upload resource (verified users only)
router.get("/my-posts", protect, getMyResources); // Get user's own resources
router.delete("/:id", protect, deleteResource); // Delete own resource

// Admin routes
router.get("/admin/all", protect, authorize("admin"), getAllResourcesAdmin); // Get all resources
router.get("/pending", protect, authorize("admin"), getPendingResources); // Get pending resources
router.put("/:id/approve", protect, authorize("admin"), approveResource); // Approve resource
router.put("/:id/reject", protect, authorize("admin"), rejectResource); // Reject resource

module.exports = router;
