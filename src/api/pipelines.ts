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
import crypto from "node:crypto"

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
    const signingSecret = crypto.randomBytes(32).toString("hex");

    type PipelineData = {
      name: string;
      action: string;
      signing_secret: string;
      rate_limit_per_min?: number;
    };
    try {
      if (
        typeof req.body.name !== "string" ||
        typeof req.body.action !== "string"
      ) {
        throw new BadRequestError("Invalid Format");
      }
      if (!Actions.includes(req.body.action)) {
        throw new BadRequestError(`Invalid action: ${req.body.action}`);
      }

      let rateLimit: number | undefined;
      if (req.body.rate_limit_per_min !== undefined) {
        rateLimit = Number(req.body.rate_limit_per_min);
        if (!Number.isInteger(rateLimit) || rateLimit <= 0) {
          throw new BadRequestError(
            "rate_limit_per_min must be a positive integer",
          );
        }
      }

      const pipelineData: PipelineData = {
        name: req.body.name,
        action: req.body.action,
        signing_secret: signingSecret,
        ...(rateLimit !== undefined && { rate_limit_per_min: rateLimit }),
      };
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
      const { name, action, rate_limit_per_min } = req.body;
      if (name === undefined && action === undefined && rate_limit_per_min === undefined) {
        throw new BadRequestError("Nothing to update");
      }
      if (name !== undefined && typeof name !== "string") {
        throw new BadRequestError("Invalid Format");
      }
      if (action !== undefined) {
        if (typeof action !== "string") {
          throw new BadRequestError("Invalid Format");
        }
        if (!Actions.includes(action)) {
          throw new BadRequestError(`Invalid action: ${action}`);
        }
      }
      let rateLimit: number | undefined;
      if (rate_limit_per_min !== undefined) {
        rateLimit = Number(rate_limit_per_min);
        if (!Number.isInteger(rateLimit) || rateLimit <= 0) {
          throw new BadRequestError(
            "rate_limit_per_min must be a positive integer",
          );
        }
      }
      const existing = await getPipelineById(pipelineID);
      if (!existing) {
        throw new NotFoundError("Pipeline not found");
      }
      const updated = await updatePipelineById(pipelineID, {
        name,
        action,
        rate_limit_per_min: rateLimit,
      });
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
