import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import dotenv from "dotenv";
import productRoutes from "./routes/productRoutes";
import { connectRedis } from "./utils/cache";
import { logger } from "./utils/logger";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000", credentials: true }));
app.use(express.json());

app.use("/", productRoutes);

const start = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://ecommerce:ecommerce123@localhost:27017/ecommerce?authSource=admin");
    logger.info("Connected to MongoDB");

    await connectRedis();

    app.listen(PORT, () => {
      logger.info(`Product service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start product service:", error);
    process.exit(1);
  }
};

start();
