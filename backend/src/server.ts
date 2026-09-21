import "dotenv/config";
import app from "./app.js";
import { config } from "./config/index.js";

if (!config.jwtSecret) {
  throw new Error("JWT_SECRET is not set. Set it in the environment before starting the server.");
}

app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
});
