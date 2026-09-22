import { ApiError } from "../api/client";

export function getRegisterErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return "Пользователь с таким email уже существует.";
    }

    if (error.status === 400) {
      return error.message;
    }
  }

  return "Не удалось выполнить регистрацию. Попробуйте позже.";
}

export function getLoginErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "Неверный email или пароль.";
    }

    if (error.status === 400) {
      return error.message;
    }
  }

  return "Не удалось выполнить вход. Попробуйте позже.";
}
