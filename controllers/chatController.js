const ChatMessage = require("../models/ChatMessage");
const User = require("../models/user");

// @desc    Get chat messages for a room (department + semester)
// @route   GET /api/chat/messages/:department/:semester
// @access  Private
const getRoomMessages = async (req, res) => {
  try {
    const { department, semester } = req.params;
    const { limit = 50, before } = req.query; // Pagination support

    const roomId = `${department}_${semester}`;

    // Build query
    let query = {
      roomId,
      isDeleted: false,
    };

    // For pagination - get messages before a certain date
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await ChatMessage.find(query)
      .sort({ createdAt: -1 }) // Latest first
      .limit(parseInt(limit))
      .populate("userId", "fullName email")
      .populate("replyTo");

    // Reverse to show oldest first
    const sortedMessages = messages.reverse();

    res.status(200).json({
      success: true,
      count: messages.length,
      messages: sortedMessages,
      hasMore: messages.length === parseInt(limit),
    });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
      error: error.message,
    });
  }
};

// @desc    Send a new message
// @route   POST /api/chat/messages
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const {
      department,
      semester,
      message,
      messageType,
      fileUrl,
      fileName,
      replyTo,
    } = req.body;

    if (!department || !semester || !message) {
      return res.status(400).json({
        success: false,
        message: "Department, semester, and message are required",
      });
    }

    const roomId = `${department}_${semester}`;

    const newMessage = await ChatMessage.create({
      roomId,
      department,
      semester,
      message,
      messageType: messageType || "text",
      fileUrl,
      fileName,
      replyTo,
      userId: req.user._id,
      userName: req.user.fullName,
      userEmail: req.user.email,
    });

    // Populate user data
    await newMessage.populate("userId", "fullName email");
    if (replyTo) {
      await newMessage.populate("replyTo");
    }

    res.status(201).json({
      success: true,
      message: newMessage,
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message",
      error: error.message,
    });
  }
};

// @desc    Delete a message
// @route   DELETE /api/chat/messages/:messageId
// @access  Private
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await ChatMessage.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    // Check if user owns the message
    if (message.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this message",
      });
    }

    message.isDeleted = true;
    message.deletedAt = Date.now();
    message.message = "This message was deleted";
    await message.save();

    res.status(200).json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete message",
      error: error.message,
    });
  }
};

// @desc    Get unread message count for a room
// @route   GET /api/chat/unread/:department/:semester
// @access  Private
const getUnreadCount = async (req, res) => {
  try {
    const { department, semester } = req.params;
    const roomId = `${department}_${semester}`;

    // Get user's last read timestamp from User model or separate collection
    // For now, count messages created after user's last visit
    const count = await ChatMessage.countDocuments({
      roomId,
      isDeleted: false,
      userId: { $ne: req.user._id }, // Exclude own messages
      createdAt: { $gt: req.user.lastChatVisit || new Date(0) },
    });

    res.status(200).json({
      success: true,
      unreadCount: count,
    });
  } catch (error) {
    console.error("Get unread count error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get unread count",
      error: error.message,
    });
  }
};

// @desc    Mark messages as read
// @route   PUT /api/chat/read/:department/:semester
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const { department, semester } = req.params;

    // Update user's last chat visit time
    await User.findByIdAndUpdate(req.user._id, {
      lastChatVisit: Date.now(),
    });

    res.status(200).json({
      success: true,
      message: "Marked as read",
    });
  } catch (error) {
    console.error("Mark as read error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark as read",
      error: error.message,
    });
  }
};

// @desc    Get active users in a room (online users)
// @route   GET /api/chat/active/:department/:semester
// @access  Private
const getActiveUsers = async (req, res) => {
  try {
    const { department, semester } = req.params;

    // This will be managed via Socket.io
    // For now, return users who were active in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const activeUsers = await User.find({
      lastActive: { $gt: fiveMinutesAgo },
    }).select("fullName email lastActive");

    res.status(200).json({
      success: true,
      count: activeUsers.length,
      users: activeUsers,
    });
  } catch (error) {
    console.error("Get active users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get active users",
      error: error.message,
    });
  }
};

module.exports = {
  getRoomMessages,
  sendMessage,
  deleteMessage,
  getUnreadCount,
  markAsRead,
  getActiveUsers,
};
