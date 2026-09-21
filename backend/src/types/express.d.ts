export {};

declare global {
  namespace Express {
    interface Request {
      user: {
        uuid: string;
      };
    }
  }
}
