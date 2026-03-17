import "dotenv/config";
import { worker } from "./worker.js";

try {
  await worker();
} catch (error) {
  console.error("Worker process crashed:", error);
  process.exit(1);
}
