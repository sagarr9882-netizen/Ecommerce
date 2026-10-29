import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import orderRoutes from "./routes/orderRoutes";
import { connectRabbitMQ } from "./utils/rabbitmq";
import { logger } from "./utils/logger";
import { errorHandler } from "./middlewares/errorHandler";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000", credentials: true }));

app.use("/webhook/stripe", express.raw({ type: "application/json" }));
app.use(express.json());

app.use("/", orderRoutes);

app.use(errorHandler);

const start = async () => {
  try {
    await connectRabbitMQ();

    app.listen(PORT, () => {
      logger.info(`Order service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start order service:", error);
    process.exit(1);
  }
};

start();
