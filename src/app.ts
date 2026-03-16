import express, { Request, Response } from "express";
import "dotenv/config";
import { pipelineRouter } from "./api/pipelines.js";
import { subscriberRouter } from "./api/subscribers.js";
import { jobsRouter } from "./api/jobs.js";
import { webhookHandler } from "./api/webhookAPIHandle.js";
import { errorHandler } from "./errorHandling.js";
import { APIKeyValidation } from "./APIKeyValidation.js";

const app = express();
const port = 3000;
app.use(
  express.json(),
);
app.use("/api/pipelines", APIKeyValidation, pipelineRouter);
app.use(
  "/api/pipelines/:pipelineId/subscribers",
  APIKeyValidation,
  subscriberRouter,
);
app.use("/api/jobs", APIKeyValidation, jobsRouter);
app.post("/api/webhook/:pipelineId", webhookHandler);

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

app.use(errorHandler);

app.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}`);
});
