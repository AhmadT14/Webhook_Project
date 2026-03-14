import express, { NextFunction, Request, Response } from "express";
import {
  addToHistory,
  getFullDeliveryAttempty,
  getDeliveryAttemptysByJobId,
  getJobStatus,
  getJobStatusById,
} from "../db/queries/jobsHistory.js";
import { BadRequestError, NotFoundError } from "src/errors.js";

const historyRouter = express.Router();

historyRouter.get(
  "/deliveryAttempts",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const history = await getFullDeliveryAttempty();
      res.status(200).send(history);
    } catch (err) {
      next(err);
    }
  },
);

historyRouter.get(
  "/deliveryAttempts/:jobId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const jobId = Array.isArray(req.params.jobId)
        ? req.params.jobId[0]
        : req.params.jobId;
      if (!jobId) {
        throw new BadRequestError("Invalid Format");
      }
      const history = await getDeliveryAttemptysByJobId(jobId);
      if (!history) {
        throw new NotFoundError("History Not Found!");
      }
      res.status(200).send(history);
    } catch (err) {
      next(err);
    }
  },
);

historyRouter.get(
  "/jobs",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const jobId = Array.isArray(req.params.jobId)
        ? req.params.jobId[0]
        : req.params.jobId;
      if (!jobId) {
        throw new BadRequestError("Invalid Format");
      }
      const jobs = await getJobStatus();
      if (!jobs) {
        throw new NotFoundError("No Jobs Found!");
      }
      res.status(200).send(jobs);
    } catch (err) {
      next(err);
    }
  },
);

historyRouter.get(
  "/jobs/:jobID",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const jobId = Array.isArray(req.params.jobId)
        ? req.params.jobId[0]
        : req.params.jobId;
      if (!jobId) {
        throw new BadRequestError("Invalid Format");
      }
      const job = await getJobStatusById(jobId);
      if (!job) {
        throw new NotFoundError("Job Not Found!");
      }
      res.status(200).send(job);
    } catch (err) {
      next(err);
    }
  },
);

historyRouter.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    type HistoryData = {
      job_id: string;
      subscriber_id: string;
      subscriber_attempt_status?: string;
      attemptNo:number
    };
    try {
      if (
        !req.body.job_id ||
        !req.body.subscriber_name ||
        !req.body.attempt_No ||
        !req.body.attempt_status ||
        !req.body.attemptNo
      ) {
        throw new BadRequestError("Invalid Format");
      }
      const historyData: HistoryData = req.body;
      const history = await addToHistory(historyData);
      res.status(201).send(history);
    } catch (err) {
      next(err);
    }
  },
);
