import bcrypt from "bcrypt";
import { userRepository } from "../repositories/userRepository.js";
import type { LoginInput, LoginResult, RegisteredUser, RegisterInput } from "../types/auth.js";
import { HttpError } from "../utils/httpError.js";
import { createAccessToken } from "../utils/jwt.js";

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

export async function loginUser(input: LoginInput): Promise<LoginResult> {
  const email = input.email.trim().toLowerCase();
  const user = await userRepository.findByEmail(email);

  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new HttpError(401, "Invalid email or password");
  }

  return {
    token: createAccessToken(user.uuid),
    user: {
      uuid: user.uuid,
      email: user.email,
    },
  };
}
