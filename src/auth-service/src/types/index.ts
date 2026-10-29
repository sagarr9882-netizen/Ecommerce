import { Request } from "express";

export interface UserPayload {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
}

export interface AuthRequest extends Request {
  user?: UserPayload;
}

export interface RegisterBody {
  name: string;
  email: string;
  password: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface ProfileBody {
  name?: string;
  phone?: string;
  address?: string;
  avatar?: string;
}
