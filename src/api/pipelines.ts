import express, { Request, Response } from "express";
import {
  getAllPipelines,
  getPipelineById,
  createPipeline,
  deletePipelineById,
} from "../db/queries/pipelines.js";

const pipelineRouter = express.Router();

pipelineRouter.get("/", async (req: Request, res: Response) => {
  try {
    const pipelines = await getAllPipelines();
    if (pipelines) {
      console.error("No Pipelines in system");
      return;
    }
    res.send(pipelines);
  } catch (err) {
    console.log(err);
  }
});

pipelineRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const pipelineId = req.params.id[0];
    const pipeline = await getPipelineById(pipelineId);
    if (pipeline) {
      console.error("Pipeline not found");
      return;
    }
    res.send(pipeline);
  } catch (err) {
    console.log(err);
  }
});

pipelineRouter.post("/", async (req: Request, res: Response) => {
  type PipelineData = {
    name: string;
    actions: string;
  };
  try {
    const pipelineData: PipelineData = req.body;
    console.log(req.params.pipelineId);
    const pipeline = await createPipeline(pipelineData);
    res.send(pipeline);
  } catch (err) {
    console.log(err);
  }
});

// pipelineRouter.put("/:id", (req:Request, res:Response) => {
//   try{
//   }
//   catch(err){
//     console.log(err)
//   }
// });

pipelineRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const pipelineId = req.params.id[0];
    const pipeline = await deletePipelineById(pipelineId);
    res.send(pipeline);
  } catch (err) {
    console.log(err);
  }
});

export { pipelineRouter };
