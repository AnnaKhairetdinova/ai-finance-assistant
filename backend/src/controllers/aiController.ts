import type { NextFunction, Request, Response } from "express";
import { aiService } from "../services/aiService.js";
import { parseAIInsightsBody } from "../validators/aiValidator.js";

export async function generateInsights(req: Request, res: Response, next: NextFunction) {
  try {
    const period = parseAIInsightsBody(req.body);
    const context = await aiService.generateInsights(req.user.uuid, period);
    res.status(200).json(context);
  } catch (error) {
    next(error);
  }
}
