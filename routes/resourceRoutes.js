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
  getResourceCounts,
} = require("../controllers/resourceController");

// Public routes
router.get("/", getResources); // Get all approved resources
router.get("/counts", getResourceCounts); // Get resource counts for dashboard
router.put("/:id/download", incrementDownload); // Track downloads
router.put("/:id/view", incrementView); // Track views

// User routes (protected)
router.post("/upload", protect, uploadResource); // Upload new resource
router.get("/my-posts", protect, getMyResources); // Get user's resources
router.delete("/:id", protect, deleteResource); // Delete user's resource

// Admin routes
router.get("/admin/all", protect, authorize("admin"), getAllResourcesAdmin); // All resources
router.get("/pending", protect, authorize("admin"), getPendingResources); // Pending approval
router.put("/:id/approve", protect, authorize("admin"), approveResource); // Approve resource
router.put("/:id/reject", protect, authorize("admin"), rejectResource); // Reject resource

module.exports = router;
