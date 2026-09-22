export type User = {
  uuid: string;
  email: string;
};

export type LoginResponse = {
  token: string;
  user: User;
};

export type RegisterResponse = {
  uuid: string;
  email: string;
};
