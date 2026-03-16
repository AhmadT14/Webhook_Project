import { NextFunction, Request, Response } from "express";
import "dotenv/config";
import { createJob } from "../db/queries/jobs.js";
import { BadRequestError, NotFoundError } from "../errors.js";
import { getPipelineById } from "../db/queries/pipelines.js";

const webhookUrlPath = "/api/webhooks/:pipelineId";

export async function webhookHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = Array.isArray(req.params.pipelineId)
      ? req.params.pipelineId[0]
      : req.params.pipelineId;
    if (!id) {
      throw new BadRequestError("Invalid Format");
    }
    if (!req.body) {
      throw new BadRequestError("Invalid Format");
    }
    const data = req.body;
    const pipeline = await getPipelineById(id);
    if (!pipeline) {
      throw new NotFoundError("Pipeline not found");
    }

    const job = await createJob({
      pipeline_id: id,
      payload: JSON.stringify(data),
    });
    res.status(201).send(job);
  } catch (err) {
    next(err);
  }
}
