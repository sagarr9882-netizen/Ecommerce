import { Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { validationResult } from "express-validator";
import crypto from "crypto";
import { AuthRequest, RegisterBody, LoginBody, ProfileBody } from "../types";
import { AppError } from "../middlewares/errorHandler";
import { logger } from "../utils/logger";

const prisma = new PrismaClient();

const generateTokens = (userId: string, email: string, role: string) => {
  const accessToken = jwt.sign(
    { id: userId, email, role },
    process.env.JWT_SECRET || "secret",
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET || "refresh-secret",
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};

export const register = async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password } = req.body as RegisterBody;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError("Email already in use", 409);
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword },
  });

  const tokens = generateTokens(user.id, user.email, user.role);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: tokens.refreshToken },
  });

  logger.info(`User registered: ${user.email}`);
  return res.status(201).json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    ...tokens,
  });
};

export const login = async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body as LoginBody;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    throw new AppError("Invalid credentials", 401);
  }

  const tokens = generateTokens(user.id, user.email, user.role);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: tokens.refreshToken },
  });

  logger.info(`User logged in: ${user.email}`);
  return res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    ...tokens,
  });
};

export const refreshToken = async (req: AuthRequest, res: Response) => {
  const { refreshToken: token } = req.body;
  if (!token) {
    throw new AppError("Refresh token required", 400);
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || "refresh-secret"
    ) as { id: string };

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || user.refreshToken !== token) {
      throw new AppError("Invalid refresh token", 401);
    }

    const tokens = generateTokens(user.id, user.email, user.role);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refreshToken },
    });

    return res.json(tokens);
  } catch {
    throw new AppError("Invalid refresh token", 401);
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, name: true, email: true, role: true, avatar: true, phone: true, address: true, createdAt: true },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return res.json(user);
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const data = req.body as ProfileBody;

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data,
    select: { id: true, name: true, email: true, role: true, avatar: true, phone: true, address: true },
  });

  logger.info(`Profile updated: ${user.email}`);
  return res.json(user);
};

export const forgotPassword = async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return res.json({ message: "If the email exists, a reset link has been sent" });
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenExp = new Date(Date.now() + 3600000);

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetTokenExp },
  });

  logger.info(`Password reset requested: ${email}`);
  return res.json({ message: "If the email exists, a reset link has been sent" });
};

export const resetPassword = async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { token, password } = req.body;

  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExp: { gte: new Date() },
    },
  });

  if (!user) {
    throw new AppError("Invalid or expired reset token", 400);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExp: null,
    },
  });

  logger.info(`Password reset completed: ${user.email}`);
  return res.json({ message: "Password reset successfully" });
};
