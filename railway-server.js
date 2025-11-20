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

// CORS configuration
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL,
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
  ].filter(Boolean),
  credentials: true,
  optionsSuccessStatus: 200,
};

// Middleware
// Add this right after your CORS middleware
app.use(cors(corsOptions));

// Add CORS debugging middleware
app.use((req, res, next) => {
  console.log('CORS Headers:', {
    origin: req.headers.origin,
    'access-control-request-method': req.headers['access-control-request-method']
  });
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
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

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/chat", chatRoutes);

// Health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running on Railway with WebSockets!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Root route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "UNIBRO Backend API with Real-time Chat!",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    features: ["REST API", "WebSocket Chat", "Authentication"],
  });
});

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL,
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:5174",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

setupChatSocket(io);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.path,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

// Start server
const PORT = process.env.PORT || 5001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`
🚀 UNIBRO Server running on port ${PORT}
✅ REST API: http://localhost:${PORT}
✅ WebSockets: ws://localhost:${PORT}
✅ Health: http://localhost:${PORT}/api/health
  `);
});
