import express, { Request, Response } from "express";
import "dotenv/config";
import { pipelineRouter } from "./api/pipelines.js";

const app = express();
const port = 3000;
app.use("/pipelines", pipelineRouter);

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});
app.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}`);
});

const webhookUrlPath = "/webhook/:pipelineId";

app.post(webhookUrlPath, (req: Request, res: Response) => {
  try {
    console.log(req.params.pipelineId);
    res.send();
  } catch (err) {
    console.log(err);
  }
});
