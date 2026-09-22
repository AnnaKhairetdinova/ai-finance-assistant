import { Router } from "express";
import { generateInsights } from "../controllers/aiController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

export const aiRoutes = Router();

aiRoutes.post("/insights", authMiddleware, generateInsights);
