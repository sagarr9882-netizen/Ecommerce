import amqp from "amqplib";
import { logger } from "./logger";

let channel: amqp.Channel;

export const connectRabbitMQ = async () => {
  const connection = await amqp.connect(
    process.env.RABBITMQ_URL || "amqp://ecommerce:ecommerce123@localhost:5672"
  );
  channel = await connection.createChannel();
  await channel.assertExchange("orders", "topic", { durable: true });
  logger.info("Connected to RabbitMQ");
  return channel;
};

export const publishEvent = async (
  routingKey: string,
  data: any
) => {
  if (!channel) {
    throw new Error("RabbitMQ channel not initialized");
  }

  channel.publish("orders", routingKey, Buffer.from(JSON.stringify(data)), {
    persistent: true,
  });

  logger.info(`Event published: ${routingKey}`);
};

export const getChannel = () => channel;
