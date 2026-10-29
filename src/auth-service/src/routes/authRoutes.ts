import { Router } from "express";
import {
  register,
  login,
  refreshToken,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword,
} from "../controllers/authController";
import { authenticate } from "../middlewares/auth";
import {
  registerValidation,
  loginValidation,
  profileValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} from "../validators/auth";

const router = Router();

router.post("/register", registerValidation, register);
router.post("/login", loginValidation, login);
router.post("/refresh-token", refreshToken);
router.get("/me", authenticate, getMe);
router.put("/profile", authenticate, profileValidation, updateProfile);
router.post("/forgot-password", forgotPasswordValidation, forgotPassword);
router.post("/reset-password", resetPasswordValidation, resetPassword);

export default router;
