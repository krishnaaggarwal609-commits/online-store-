import "dotenv/config";
import path from "path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { attachUser } from "./lib/auth";
import { localUploadDir } from "./lib/storage";
import { errorHandler, notFound } from "./middleware";
import { logger } from "./logger";
import authRoutes from "./routes/auth";
import catalogRoutes from "./routes/catalog";
import cartRoutes from "./routes/cart";
import checkoutRoutes from "./routes/checkout";
import paymentRoutes from "./routes/payments";
import orderRoutes from "./routes/orders";
import accountRoutes from "./routes/account";
import adminRoutes from "./routes/admin";

const app = express();
const PORT = Number(process.env.API_PORT || 4000);

app.set("trust proxy", 1);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  })
);
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(
  express.json({
    limit: "2mb",
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: string }).rawBody = buf.toString("utf8");
    },
  })
);
app.use(express.urlencoded({ extended: true }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait and try again." },
});

app.use("/uploads", express.static(localUploadDir()));
app.use("/media", express.static(path.join(process.cwd(), "public", "media")));

app.use(attachUser);

app.get("/api/v1/health", (_req, res) => {
  res.json({
    data: {
      ok: true,
      service: "aarohi-api",
      time: new Date().toISOString(),
    },
  });
});

app.use("/api/v1/auth/login", authLimiter);
app.use("/api/v1/auth/register", authLimiter);
app.use("/api/v1/auth/forgot-password", authLimiter);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1", catalogRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/checkout", checkoutRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/account", accountRoutes);
app.use("/api/v1/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, "0.0.0.0", () => {
  logger.info(`Aarohi API listening on ${PORT}`);
});
