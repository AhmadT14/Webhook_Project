import express, { NextFunction, Request, Response } from "express";
import {
  getAllPipelines,
  getPipelineById,
  createPipeline,
  deletePipelineById,
} from "../db/queries/pipelines.js";
import { BadRequestError, NotFoundError } from "../errors.js";

const pipelineRouter = express.Router();

pipelineRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pipelines = await getAllPipelines();
      res.status(200).send(pipelines);
    } catch (err) {
      next(err);
    }
  },
);

pipelineRouter.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pipelineId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      if (!pipelineId) {
        throw new BadRequestError("Invalid Format");
      }
      const pipeline = await getPipelineById(pipelineId);
      if (!pipeline) {
        throw new NotFoundError("Pipeline Not Found!");
      }
      res.status(200).send(pipeline);
    } catch (err) {
      next(err);
    }
  },
);

pipelineRouter.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    type PipelineData = {
      name: string;
      actions: string;
    };
    try {
      if (!req.body.name || !req.body.actions) {
        throw new BadRequestError("Invalid Format");
      }
      const pipelineData: PipelineData = req.body;
      const pipeline = await createPipeline(pipelineData);
      res.status(201).send(pipeline);
    } catch (err) {
      next(err);
    }
  },
);

pipelineRouter.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pipelineId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      if (!pipelineId) {
        throw new BadRequestError("Invalid Format");
      }
      const existing = await getPipelineById(pipelineId);
      if (!existing) {
        throw new NotFoundError("Pipeline not found");
      }
      await deletePipelineById(pipelineId);
      res.status(200).send({ message: "Pipeline deleted" });
    } catch (err) {
      next(err);
    }
  },
);

export { pipelineRouter };
