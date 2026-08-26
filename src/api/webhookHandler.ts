import { NextFunction, Request, Response } from "express";
import "dotenv/config";
import { createJobsForSubscribers } from "../db/queries/jobs.js";
import { BadRequestError, NotFoundError, TooManyRequestsError } from "../errors.js";
import { getPipelineById } from "../db/queries/pipelines.js";
import { getSubscribersByPipelineId } from "../db/queries/subscribers.js";
import { verifySignature } from "../middlewares/webhookSignitureValidation.js";
import { checkAndRecordRequest } from "../db/queries/ratelimit.js";


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

    const pipeline = await getPipelineById(id);
    if (!pipeline) {
      throw new NotFoundError("Pipeline not found");
    }

    const { allowed } = await checkAndRecordRequest(id, pipeline.rate_limit_per_min);
    if (!allowed) {
      throw new TooManyRequestsError("Rate limit exceeded for this pipeline");
    }

    const signingSecret = pipeline.signing_secret;

    const data = req.body;
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      throw new BadRequestError("Invalid Format");
    }

    const signature = req.get("X-Webhook-Signature");
    if (!signature) {
      throw new BadRequestError("Missing webhook signature");
    }

    if (!signingSecret) {
      throw new Error("WEBHOOK_SIGNING_SECRET is not configured");
    }

    const valid = verifySignature(JSON.stringify(data), signature, signingSecret);
    if (!valid) {
      throw new BadRequestError("Invalid webhook signature");
    }

    const subscribers = await getSubscribersByPipelineId(id);
    if (subscribers.length === 0) {
      throw new NotFoundError("Subscriber not found");
    }

    const jobs = await createJobsForSubscribers(
      subscribers.map((subscriber) => ({
        pipeline_id: id,
        subscriber_id: subscriber.id,
        payload: data,
      })),
    );

    res.status(201).send(jobs);
  } catch (err) {
    next(err);
  }
}
