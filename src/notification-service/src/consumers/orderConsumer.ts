import amqp from "amqplib";
import { OrderEvent } from "../types";
import { sendEmail } from "../utils/email";
import { NotificationModel } from "../models/Notification";
import { logger } from "../utils/logger";
import {
  orderCreatedTemplate,
  paymentConfirmedTemplate,
  orderShippedTemplate,
  orderDeliveredTemplate,
} from "../templates/emails";

const RABBITMQ_URL =
  process.env.RABBITMQ_URL || "amqp://ecommerce:ecommerce123@localhost:5672";

const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      logger.warn(`Retry ${attempt}/${maxRetries} after ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay * attempt));
    }
  }
  throw new Error("All retries exhausted");
};

const handleOrderCreated = async (data: OrderEvent) => {
  logger.info(`Processing order.created: ${data.orderId}`);

  const html = orderCreatedTemplate({
    orderId: data.orderId,
    total: data.total || 0,
    items: data.items || [],
  });

  await retryWithBackoff(async () => {
    await sendEmail(
      "customer@example.com",
      `Order Confirmed - #${data.orderId}`,
      html
    );
    return true;
  });

  await NotificationModel.create({
    type: "order.created",
    email: "customer@example.com",
    subject: `Order Confirmed - #${data.orderId}`,
    html,
    metadata: data,
    status: "sent",
  });
};

const handlePaymentConfirmed = async (data: OrderEvent) => {
  logger.info(`Processing payment.confirmed: ${data.orderId}`);

  const html = paymentConfirmedTemplate({ orderId: data.orderId });

  await retryWithBackoff(async () => {
    await sendEmail(
      "customer@example.com",
      `Payment Confirmed - #${data.orderId}`,
      html
    );
    return true;
  });

  await NotificationModel.create({
    type: "payment.confirmed",
    email: "customer@example.com",
    subject: `Payment Confirmed - #${data.orderId}`,
    html,
    metadata: data,
    status: "sent",
  });
};

const handleOrderShipped = async (data: OrderEvent) => {
  logger.info(`Processing order.shipped: ${data.orderId}`);

  const html = orderShippedTemplate({
    orderId: data.orderId,
    trackingNumber: data.trackingNumber || "",
    estimatedDelivery: data.estimatedDelivery || "",
  });

  await retryWithBackoff(async () => {
    await sendEmail(
      "customer@example.com",
      `Your Order Has Shipped - #${data.orderId}`,
      html
    );
    return true;
  });

  await NotificationModel.create({
    type: "order.shipped",
    email: "customer@example.com",
    subject: `Your Order Has Shipped - #${data.orderId}`,
    html,
    metadata: data,
    status: "sent",
  });
};

const handleOrderDelivered = async (data: OrderEvent) => {
  logger.info(`Processing order.delivered: ${data.orderId}`);

  const html = orderDeliveredTemplate({ orderId: data.orderId });

  await retryWithBackoff(async () => {
    await sendEmail(
      "customer@example.com",
      `Order Delivered - #${data.orderId}`,
      html
    );
    return true;
  });

  await NotificationModel.create({
    type: "order.delivered",
    email: "customer@example.com",
    subject: `Order Delivered - #${data.orderId}`,
    html,
    metadata: data,
    status: "sent",
  });
};

export const startConsumer = async () => {
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();

  await channel.assertExchange("orders", "topic", { durable: true });

  const queue = await channel.assertQueue("notifications", { durable: true });

  const routingKeys = [
    "order.created",
    "payment.confirmed",
    "order.shipped",
    "order.delivered",
  ];

  for (const key of routingKeys) {
    await channel.bindQueue(queue.queue, "orders", key);
  }

  const handlers: Record<string, (data: OrderEvent) => Promise<void>> = {
    "order.created": handleOrderCreated,
    "payment.confirmed": handlePaymentConfirmed,
    "order.shipped": handleOrderShipped,
    "order.delivered": handleOrderDelivered,
  };

  channel.consume(queue.queue, async (msg) => {
    if (!msg) return;

    const routingKey = msg.fields.routingKey;
    const data: OrderEvent = JSON.parse(msg.content.toString());

    logger.info(`Received event: ${routingKey}`, data);

    try {
      const handler = handlers[routingKey];
      if (handler) {
        await handler(data);
      }
      channel.ack(msg);
    } catch (error) {
      logger.error(`Error processing ${routingKey}:`, error);
      channel.nack(msg, false, true);
    }
  });

  logger.info("Notification consumer started");
};
