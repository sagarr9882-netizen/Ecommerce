import { Request } from "express";

export interface UserPayload {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
}

export interface AuthRequest extends Request {
  user?: UserPayload;
}

export interface ProductQuery {
  page?: string;
  limit?: string;
  search?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
  featured?: string;
}
