import express, { NextFunction, Request, Response } from "express";
import {
  getAllPipelines,
  getPipelineById,
  createPipeline,
  deletePipelineById,
  updatePipelineById,
} from "../db/queries/pipelines.js";
import { BadRequestError, NotFoundError } from "../errors.js";
import { Actions } from "../actions.js";

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
  "/:pipelineId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pipelineID = Array.isArray(req.params.pipelineId)
        ? req.params.pipelineId[0]
        : req.params.pipelineId;
      if (!pipelineID) {
        throw new BadRequestError("Invalid Format");
      }
      const pipeline = await getPipelineById(pipelineID);
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
      action: string;
    };
    try {
      if (
        typeof req.body.name !== "string" ||
        typeof req.body.actions !== "string"
      ) {
        throw new BadRequestError("Invalid Format");
      }
      if (!Actions.includes(req.body.actions)) {
        throw new BadRequestError(`Invalid action: ${req.body.actions}`);
      }
      const pipelineData: PipelineData = req.body;
      const pipeline = await createPipeline(pipelineData);
      res.status(201).send(pipeline);
    } catch (err) {
      next(err);
    }
  },
);

pipelineRouter.put(
  "/:pipelineId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pipelineID = Array.isArray(req.params.pipelineId)
        ? req.params.pipelineId[0]
        : req.params.pipelineId;
      if (!pipelineID) {
        throw new BadRequestError("Invalid Format");
      }
      const { name, actions } = req.body;
      if (!name && !actions) {
        throw new BadRequestError("Nothing to update");
      }
      if (name !== undefined && typeof name !== "string") {
        throw new BadRequestError("Invalid Format");
      }
      if (actions !== undefined) {
        if (typeof actions !== "string") {
          throw new BadRequestError("Invalid Format");
        }
        if (!Actions.includes(actions)) {
          throw new BadRequestError(`Invalid action: ${actions}`);
        }
      }
      const existing = await getPipelineById(pipelineID);
      if (!existing) {
        throw new NotFoundError("Pipeline not found");
      }
      const updated = await updatePipelineById(pipelineID, { name, actions });
      res.status(200).send(updated);
    } catch (err) {
      next(err);
    }
  },
);

pipelineRouter.delete(
  "/:pipelineId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pipelineID = Array.isArray(req.params.pipelineId)
        ? req.params.pipelineId[0]
        : req.params.pipelineId;
      if (!pipelineID) {
        throw new BadRequestError("Invalid Format");
      }
      const existing = await getPipelineById(pipelineID);
      if (!existing) {
        throw new NotFoundError("Pipeline not found");
      }
      await deletePipelineById(pipelineID);
      res.status(200).send({ message: "Pipeline deleted" });
    } catch (err) {
      next(err);
    }
  },
);

export { pipelineRouter };
