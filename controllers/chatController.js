const ChatMessage = require("../models/ChatMessage");
const User = require("../models/user");

// Get chat messages for a room with pagination
const getRoomMessages = async (req, res) => {
  try {
    const { department, semester } = req.params;
    const { limit = 50, before } = req.query;

    const roomId = `${department}_${semester}`;

    let query = {
      roomId,
      isDeleted: false,
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await ChatMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate("userId", "fullName email")
      .populate("replyTo");

    const sortedMessages = messages.reverse();

    res.status(200).json({
      success: true,
      count: messages.length,
      messages: sortedMessages,
      hasMore: messages.length === parseInt(limit),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
      error: error.message,
    });
  }
};

// Send a new message
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

    await newMessage.populate("userId", "fullName email");
    if (replyTo) {
      await newMessage.populate("replyTo");
    }

    res.status(201).json({
      success: true,
      message: newMessage,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to send message",
      error: error.message,
    });
  }
};

// Delete a message (soft delete)
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
    res.status(500).json({
      success: false,
      message: "Failed to delete message",
      error: error.message,
    });
  }
};

// Get unread message count for a room
const getUnreadCount = async (req, res) => {
  try {
    const { department, semester } = req.params;
    const roomId = `${department}_${semester}`;

    const count = await ChatMessage.countDocuments({
      roomId,
      isDeleted: false,
      userId: { $ne: req.user._id },
      createdAt: { $gt: req.user.lastChatVisit || new Date(0) },
    });

    res.status(200).json({
      success: true,
      unreadCount: count,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get unread count",
      error: error.message,
    });
  }
};

// Mark messages as read
const markAsRead = async (req, res) => {
  try {
    const { department, semester } = req.params;

    await User.findByIdAndUpdate(req.user._id, {
      lastChatVisit: Date.now(),
    });

    res.status(200).json({
      success: true,
      message: "Marked as read",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to mark as read",
      error: error.message,
    });
  }
};

// Get active users in a room
const getActiveUsers = async (req, res) => {
  try {
    const { department, semester } = req.params;
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
