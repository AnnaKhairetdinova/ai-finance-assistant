import jwt, { type SignOptions } from "jsonwebtoken";
import { config } from "../config/index.js";

export function createAccessToken(uuid: string): string {
  if (!config.jwtSecret) {
    throw new Error("JWT_SECRET is not set");
  }

  const options: SignOptions = {
    expiresIn: config.jwtExpiresIn as SignOptions["expiresIn"],
  };

  return jwt.sign({ uuid }, config.jwtSecret, options);
}
