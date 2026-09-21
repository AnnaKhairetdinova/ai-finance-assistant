import { Router } from "express";
import { create, getByUuid, list, remove, update } from "../controllers/transactionController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

export const transactionRoutes = Router();

transactionRoutes.get("/", authMiddleware, list);
transactionRoutes.post("/", authMiddleware, create);
transactionRoutes.get("/:uuid", authMiddleware, getByUuid);
transactionRoutes.patch("/:uuid", authMiddleware, update);
transactionRoutes.delete("/:uuid", authMiddleware, remove);
