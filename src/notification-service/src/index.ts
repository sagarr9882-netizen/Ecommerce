import mongoose from "mongoose";
import dotenv from "dotenv";
import { startConsumer } from "./consumers/orderConsumer";
import { logger } from "./utils/logger";

dotenv.config();

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const start = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI ||
        "mongodb://ecommerce:ecommerce123@localhost:27017/ecommerce?authSource=admin"
    );
    logger.info("Connected to MongoDB");
  } catch (error) {
    logger.error("Failed to connect to MongoDB:", error);
    process.exit(1);
  }

  let retries = 10;
  while (retries > 0) {
    try {
      await startConsumer();
      logger.info("Notification service running");
      return;
    } catch (error) {
      retries--;
      if (retries === 0) {
        logger.error("Failed to start consumer after retries:", error);
        process.exit(1);
      }
      logger.warn(`RabbitMQ not ready, retrying... (${retries} left)`);
      await wait(5000);
    }
  }
};

start();
