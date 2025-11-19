const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getRoomMessages,
  sendMessage,
  deleteMessage,
  getUnreadCount,
  markAsRead,
  getActiveUsers,
} = require("../controllers/chatController");

// All routes require authentication
router.use(protect);

// Get messages for a specific room (department + semester)
router.get("/messages/:department/:semester", getRoomMessages);

// Send a new message
router.post("/messages", sendMessage);

// Delete a message
router.delete("/messages/:messageId", deleteMessage);

// Get unread message count
router.get("/unread/:department/:semester", getUnreadCount);

// Mark messages as read
router.put("/read/:department/:semester", markAsRead);

// Get active users in a room
router.get("/active/:department/:semester", getActiveUsers);

module.exports = router;
