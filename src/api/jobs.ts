import express, { NextFunction, Request, Response } from "express";
import {
  getFullDeliveryAttempts,
  getDeliveryAttemptysByJobId,
  addDeliveryAttempt,
} from "../db/queries/deliverAttempts.js";
import { BadRequestError, NotFoundError } from "../errors.js";
import { getJobs, getJobsById } from "../db/queries/jobs.js";

export const jobsRouter = express.Router();

jobsRouter.get(
  "/delivery-attempts",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const history = await getFullDeliveryAttempts();
      res.status(200).send(history);
    } catch (err) {
      next(err);
    }
  },
);

jobsRouter.get(
  "/deliveryAttempts",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const history = await getFullDeliveryAttempts();
      res.status(200).send(history);
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
      const history = await getDeliveryAttemptysByJobId(jobID);
      if (!history) {
        throw new NotFoundError("History Not Found!");
      }
      res.status(200).send(history);
    } catch (err) {
      next(err);
    }
  },
);


jobsRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const jobs = await getJobs();
      if (!jobs) {
        throw new NotFoundError("No Jobs Found!");
      }
      res.status(200).send(jobs);
    } catch (err) {
      next(err);
    }
  },
);

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

jobsRouter.post(
  "/:jobId/delivery-attempts",
  async (req: Request, res: Response, next: NextFunction) => {
    type HistoryData = {
      subscriber_id: string;
      subscriber_attempt_status?: string;
      attempt_no: number;
    };
    try {
      const jobID = Array.isArray(req.params.jobId)
        ? req.params.jobId[0]
        : req.params.jobId;
      if (!jobID) {
        throw new BadRequestError("Invalid Format");
      }
      if (!req.body.subscriber_id || req.body.attempt_no === undefined ||
  typeof req.body.attempt_no !== "number") {
        throw new BadRequestError("Invalid Format");
      }
      const historyData: HistoryData = req.body;
      const status =
historyData.subscriber_attempt_status === "sent" ? "sent" : "failed";

const history = await addDeliveryAttempt({
job_id: jobID,
subscriber_id: historyData.subscriber_id,
attempt_no: historyData.attempt_no,
subscriber_attempt_status: status,
});
      res.status(201).send(history);
    } catch (err) {
      next(err);
    }
  },
);
