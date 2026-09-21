import { Router } from "express";
import { create, list } from "../controllers/transactionController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

export const transactionRoutes = Router();

transactionRoutes.get("/", authMiddleware, list);
transactionRoutes.post("/", authMiddleware, create);
