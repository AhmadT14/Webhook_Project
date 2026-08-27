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
import crypto from "node:crypto";

const pipelineRouter = express.Router();

function parseActions(body: {
  actions?: unknown;
}): string[] | undefined {
  if (body.actions !== undefined) {
    if (!Array.isArray(body.actions) || body.actions.length === 0) {
      throw new BadRequestError("actions must be a non-empty array");
    }
    for (const action of body.actions) {
      if (typeof action !== "string" || !Actions.includes(action)) {
        throw new BadRequestError(`Invalid action: ${String(action)}`);
      }
    }
    return body.actions as string[];
  }
  return undefined;
}

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

    try {
      if (typeof req.body.name !== "string") {
        throw new BadRequestError("Invalid Format");
      }
      const actions = parseActions(req.body);
      if (!actions) {
        throw new BadRequestError("Invalid Format");
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

      const pipeline = await createPipeline({
        name: req.body.name,
        actions,
        signing_secret: signingSecret,
        ...(rateLimit !== undefined && { rate_limit_per_min: rateLimit }),
      });
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
      const { name, actions, rate_limit_per_min } = req.body;
      if (
        name === undefined &&
        actions === undefined &&
        rate_limit_per_min === undefined
      ) {
        throw new BadRequestError("Nothing to update");
      }
      if (name !== undefined && typeof name !== "string") {
        throw new BadRequestError("Invalid Format");
      }
      const parsedActions = parseActions(req.body);
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
        ...(parsedActions !== undefined && { actions: parsedActions }),
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
