import { Router } from "express";
import { register } from "../controllers/authController.js";

export const authRoutes = Router();

authRoutes.post("/register", register);
