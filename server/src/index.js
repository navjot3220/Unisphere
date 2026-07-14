import "dotenv/config";
import { MongoMemoryServer } from 'mongodb-memory-server';
import { seedDatabase } from "./seed.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { connectDB } from "./config/db.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { startReminderScheduler } from "./services/reminders.js";

import authRoutes from "./routes/auth.js";
import eventRoutes from "./routes/events.js";
import registrationRoutes from "./routes/registrations.js";
import clubRoutes from "./routes/clubs.js";
import recommendationRoutes from "./routes/recommendations.js";
import adminRoutes from "./routes/admin.js";
import notificationRoutes from "./routes/notifications.js";
import uploadRoutes from "./routes/upload.js";
import path from "path";

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN?.split(",") || "http://localhost:5173",
  })
);
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    message: { error: "Too many requests. Slow down." },
  })
);

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/clubs", clubRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/upload", uploadRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function startServer() {
  let uri = process.env.MONGO_URI;
  if (!uri || uri.includes("localhost")) {
    const mongoServer = await MongoMemoryServer.create();
    uri = mongoServer.getUri();
    console.log(`[db] Using in-memory MongoDB: ${uri}`);
  }
  
  try {
    await connectDB(uri);
    
    // Auto-seed if it's an in-memory db
    if (!process.env.MONGO_URI || process.env.MONGO_URI.includes("localhost")) {
      const User = (await import('./models/User.js')).default;
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        console.log("[db] Empty in-memory DB detected. Seeding demo data...");
        await seedDatabase();
      }
    }

    startReminderScheduler();
    app.listen(PORT, () => console.log(`[api] listening on :${PORT}`));
  } catch (err) {
    console.error("[db] connection failed:", err.message);
    process.exit(1);
  }
}

startServer();
