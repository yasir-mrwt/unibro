// railway-server.js
require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const session = require("express-session");
const passport = require("./config/passport");
const connectDB = require("./config/db");
const http = require("http");
const { Server } = require("socket.io");
const setupChatSocket = require("./socket/chatSocket");

// Import routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const resourceRoutes = require("./routes/resourceRoutes");
const staffRoutes = require("./routes/staffRoutes");
const chatRoutes = require("./routes/chatRoutes");

// Initialize express app
const app = express();
const server = http.createServer(app);

// Connect to database
connectDB();

// --------------------------------------------------
// ✅ CORS — MUST be the first middleware
// --------------------------------------------------
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000"
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);



// Debug CORS
app.use((req, res, next) => {
  console.log("Incoming request origin:", req.headers.origin);
  next();
});

// --------------------------------------------------
// Other Middlewares
// --------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "defaultsecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// --------------------------------------------------
// Routes
// --------------------------------------------------
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/chat", chatRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server running successfully on Railway!",
    time: new Date(),
  });
});

// Root
app.get("/", (req, res) => {
  res.json({
    greeting: "UNIBRO Backend Running!",
    version: "1.0.0",
  });
});

// --------------------------------------------------
// Socket.IO with CORS
// --------------------------------------------------
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Setup chat sockets
setupChatSocket(io);

// --------------------------------------------------
// 404 Handler
// --------------------------------------------------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    endpoint: req.path,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global Error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// --------------------------------------------------
// Start Server — IMPORTANT: bind to 0.0.0.0
// --------------------------------------------------
const PORT = process.env.PORT || 5001;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Public URL: https://unibro-production.up.railway.app`);
});
