import { Router } from "express";
import { create } from "../controllers/transactionController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

export const transactionRoutes = Router();

transactionRoutes.post("/", authMiddleware, create);
