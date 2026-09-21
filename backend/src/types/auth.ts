export type RegisterInput = {
  email: string;
  password: string;
};

export type RegisteredUser = {
  uuid: string;
  email: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginResult = {
  token: string;
  user: {
    uuid: string;
    email: string;
  };
};
