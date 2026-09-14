import bcrypt from "bcrypt";
import { userRepository } from "../repositories/userRepository.js";
import type { RegisteredUser, RegisterInput } from "../types/auth.js";
import { HttpError } from "../utils/httpError.js";

const BCRYPT_ROUNDS = 10;

export async function registerUser(input: RegisterInput): Promise<RegisteredUser> {
  const email = input.email.trim().toLowerCase();

  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) {
    throw new HttpError(409, "User with this email already exists");
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  return userRepository.create({ email, passwordHash });
}
