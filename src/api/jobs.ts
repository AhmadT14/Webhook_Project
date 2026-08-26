import express, { NextFunction, Request, Response } from "express";
import {
  getFullDeliveryAttempts,
  getDeliveryAttemptsByJobId,
} from "../db/queries/deliverAttempts.js";
import { BadRequestError, NotFoundError } from "../errors.js";
import { getJobs, getJobsById, requeueFailedJob } from "../db/queries/jobs.js";

export const jobsRouter = express.Router();

jobsRouter.get(
  "/delivery-attempts",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deliveryAttempts = await getFullDeliveryAttempts();
      res.status(200).send(deliveryAttempts);
    } catch (err) {
      next(err);
    }
  },
);

jobsRouter.get(
  "/:jobId/delivery-attempts",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const jobID = Array.isArray(req.params.jobId)
        ? req.params.jobId[0]
        : req.params.jobId;
      if (!jobID) {
        throw new BadRequestError("Invalid Format");
      }
      const deliveryAttempt = await getDeliveryAttemptsByJobId(jobID);
      if (deliveryAttempt.length === 0) {
        throw new NotFoundError("Delivery Attempts Not Found!");
      }
      res.status(200).send(deliveryAttempt);
    } catch (err) {
      next(err);
    }
  },
);

jobsRouter.post(
  "/:jobId/retry",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const jobID = Array.isArray(req.params.jobId)
        ? req.params.jobId[0]
        : req.params.jobId;
      if (!jobID) {
        throw new BadRequestError("Invalid Format");
      }

      const existing = await getJobsById(jobID);
      if (!existing) {
        throw new NotFoundError("Job Not Found!");
      }
      if (existing.status !== "failed") {
        throw new BadRequestError(
          `Only failed jobs can be retried, current status: ${existing.status}`,
        );
      }

      const job = await requeueFailedJob(jobID);
      if (!job) {
        throw new BadRequestError("Job is no longer in a failed state");
      }

      res.status(200).send(job);
    } catch (err) {
      next(err);
    }
  },
);

jobsRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobs = await getJobs();
    if (!jobs) {
      throw new NotFoundError("No Jobs Found!");
    }
    res.status(200).send(jobs);
  } catch (err) {
    next(err);
  }
});

jobsRouter.get(
  "/:jobId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const jobID = Array.isArray(req.params.jobId)
        ? req.params.jobId[0]
        : req.params.jobId;
      if (!jobID) {
        throw new BadRequestError("Invalid Format");
      }
      const job = await getJobsById(jobID);
      if (!job) {
        throw new NotFoundError("Job Not Found!");
      }
      res.status(200).send(job);
    } catch (err) {
      next(err);
    }
  },
);