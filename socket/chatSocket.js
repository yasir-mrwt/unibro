const ChatMessage = require("../models/ChatMessage");
const User = require("../models/user");

// Store active users per room
const activeUsers = new Map(); // roomId -> Set of userIds

const setupChatSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`✅ User connected: ${socket.id}`);

    // Join a chat room (department + semester)
    socket.on(
      "join_room",
      async ({ department, semester, userId, userName }) => {
        try {
          const roomId = `${department}_${semester}`;
          socket.join(roomId);

          // Store user info with socket
          socket.userId = userId;
          socket.userName = userName;
          socket.roomId = roomId;

          // Track active users
          if (!activeUsers.has(roomId)) {
            activeUsers.set(roomId, new Set());
          }
          activeUsers.get(roomId).add(userId);

          // Update user's last active time
          await User.findByIdAndUpdate(userId, { lastActive: Date.now() });

          console.log(`👤 ${userName} joined room: ${roomId}`);

          // Notify room about new user
          const activeCount = activeUsers.get(roomId).size;
          io.to(roomId).emit("user_joined", {
            userId,
            userName,
            activeCount,
            message: `${userName} joined the chat`,
          });

          // Send active users list
          io.to(roomId).emit("active_users", {
            count: activeCount,
            users: Array.from(activeUsers.get(roomId)),
          });
        } catch (error) {
          console.error("Join room error:", error);
          socket.emit("error", { message: "Failed to join room" });
        }
      }
    );

    // Send message
    socket.on("send_message", async (data) => {
      try {
        const {
          department,
          semester,
          message,
          userId,
          userName,
          userEmail,
          replyTo,
        } = data;
        const roomId = `${department}_${semester}`;

        // Validate required fields
        if (!userId || !userName || !userEmail || !message) {
          console.error("❌ Missing required fields:", {
            userId,
            userName,
            userEmail,
            message,
          });
          socket.emit("error", { message: "Missing required fields" });
          return;
        }

        console.log("📝 Creating message:", {
          userId,
          userName,
          message: message.substring(0, 20),
        });

        // Save message to database
        const newMessage = await ChatMessage.create({
          roomId,
          department,
          semester,
          message,
          messageType: "text",
          userId, // MongoDB will convert string to ObjectId
          userName,
          userEmail,
          replyTo: replyTo || null,
        });

        // Populate user data
        await newMessage.populate("userId", "fullName email");
        if (replyTo) {
          await newMessage.populate("replyTo");
        }

        // Broadcast to room
        io.to(roomId).emit("receive_message", newMessage);

        console.log(`💬 Message sent in ${roomId} by ${userName}`);
      } catch (error) {
        console.error("Send message error:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // User typing indicator
    socket.on("typing", ({ roomId, userName }) => {
      socket.to(roomId).emit("user_typing", { userName });
    });

    socket.on("stop_typing", ({ roomId }) => {
      socket.to(roomId).emit("user_stop_typing");
    });

    // Delete message
    socket.on("delete_message", async ({ messageId, roomId }) => {
      try {
        const message = await ChatMessage.findById(messageId);

        if (message && message.userId.toString() === socket.userId) {
          message.isDeleted = true;
          message.deletedAt = Date.now();
          message.message = "This message was deleted";
          await message.save();

          // Notify room
          io.to(roomId).emit("message_deleted", {
            messageId,
            deletedMessage: message,
          });
        }
      } catch (error) {
        console.error("Delete message error:", error);
      }
    });

    // Leave room
    socket.on("leave_room", ({ roomId, userId, userName }) => {
      socket.leave(roomId);

      // Remove from active users
      if (activeUsers.has(roomId)) {
        activeUsers.get(roomId).delete(userId);
        const activeCount = activeUsers.get(roomId).size;

        // Notify room
        io.to(roomId).emit("user_left", {
          userId,
          userName,
          activeCount,
          message: `${userName} left the chat`,
        });

        io.to(roomId).emit("active_users", {
          count: activeCount,
          users: Array.from(activeUsers.get(roomId)),
        });
      }

      console.log(`👋 ${userName} left room: ${roomId}`);
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`❌ User disconnected: ${socket.id}`);

      // Remove from active users
      if (socket.roomId && socket.userId) {
        if (activeUsers.has(socket.roomId)) {
          activeUsers.get(socket.roomId).delete(socket.userId);
          const activeCount = activeUsers.get(socket.roomId).size;

          io.to(socket.roomId).emit("user_left", {
            userId: socket.userId,
            userName: socket.userName,
            activeCount,
            message: `${socket.userName} disconnected`,
          });

          io.to(socket.roomId).emit("active_users", {
            count: activeCount,
            users: Array.from(activeUsers.get(socket.roomId)),
          });
        }
      }
    });
  });
};

module.exports = setupChatSocket;
