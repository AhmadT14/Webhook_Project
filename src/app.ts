import express, { Request, Response } from "express";
import "dotenv/config";
import { pipelineRouter } from "./api/pipelines.js";
import { subscriberRouter } from "./api/subscribers.js";
import { historyRouter } from "./api/jobsHistory.js";
import { webhookUrlPath, webhookHandler } from "./api/webhookAPIHandle.js";
import { errorHandler } from "./errorHandling.js";

const app = express();
const port = 3000;
app.use(express.json());
app.use("/pipelines", pipelineRouter);
app.use("/pipelines/:pipelineId/subscribers", subscriberRouter);
app.use("/jobs", historyRouter);
app.post(webhookUrlPath, webhookHandler);

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

app.use(errorHandler);

app.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}`);
});
