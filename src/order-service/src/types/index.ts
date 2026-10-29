import { Request } from "express";

export interface UserPayload {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
}

export interface AuthRequest extends Request {
  user?: UserPayload;
}

export interface CreateOrderBody {
  items: { productId: string; name: string; price: number; quantity: number; image?: string }[];
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  paymentMethod: string;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export const ORDER_STATUS_FLOW: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};
