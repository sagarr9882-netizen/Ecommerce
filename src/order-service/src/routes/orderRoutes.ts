import { Router } from "express";
import { body } from "express-validator";
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  getOrderTracking,
  downloadInvoice,
  stripeWebhook,
} from "../controllers/orderController";
import { authenticate, authorize } from "../middlewares/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post(
  "/orders",
  authenticate,
  [
    body("items").isArray({ min: 1 }).withMessage("At least one item required"),
    body("items.*.productId").notEmpty(),
    body("items.*.name").notEmpty(),
    body("items.*.price").isFloat({ min: 0 }),
    body("items.*.quantity").isInt({ min: 1 }),
    body("shippingAddress").isObject().withMessage("Shipping address required"),
    body("shippingAddress.street").notEmpty(),
    body("shippingAddress.city").notEmpty(),
    body("shippingAddress.state").notEmpty(),
    body("shippingAddress.zip").notEmpty(),
    body("shippingAddress.country").notEmpty(),
  ],
  asyncHandler(createOrder)
);

router.get("/orders", authenticate, asyncHandler(getOrders));
router.get("/orders/:id", authenticate, asyncHandler(getOrderById));
router.get("/orders/:id/tracking", authenticate, asyncHandler(getOrderTracking));
router.get("/orders/:id/invoice", authenticate, asyncHandler(downloadInvoice));

router.put(
  "/orders/:id/status",
  authenticate,
  authorize("ADMIN"),
  [body("status").notEmpty().withMessage("Status is required")],
  asyncHandler(updateOrderStatus)
);

router.post("/webhook/stripe", asyncHandler(stripeWebhook));

export default router;
