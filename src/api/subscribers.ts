import express, { NextFunction, Request, Response } from "express";
import {
  getAllSubscribers,
  getSubscriberById,
  createSubscriber,
  deleteSubscriberById,
} from "../db/queries/subscribers.js";
import { BadRequestError, NotFoundError } from "../errors.js";
import { getPipelineById } from "../db/queries/pipelines.js";

const subscriberRouter = express.Router();

subscriberRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subscribers = await getAllSubscribers();
      res.status(200).send(subscribers);
    } catch (err) {
      next(err);
    }
  },
);

subscriberRouter.get(
  "/:subscriberId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subscriberID = Array.isArray(req.params.subscriberId)
        ? req.params.subscriberId[0]
        : req.params.subscriberId;
      if (!subscriberID) {
        throw new BadRequestError("Invalid Format");
      }
      const subscriber = await getSubscriberById(subscriberID);
      if (!subscriber) {
        throw new NotFoundError("Subscriber Not Found!");
      }
      res.status(200).send(subscriber);
    } catch (err) {
      next(err);
    }
  },
);

subscriberRouter.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    type SubscriberData = {
      name: string;
      pipeline_id: string;
      url: string;
    };
    try {
      const pipelineId = Array.isArray(req.params.pipelineId)
        ? req.params.pipelineId[0]
        : req.params.pipelineId;

      if (!req.body.name || !pipelineId || !req.body.url) {
        throw new BadRequestError("Invalid Format");
      }
      const pipeline = await getPipelineById(pipelineId);
      if (!pipeline) {
        throw new NotFoundError("Pipeline not found");
      }
      const SubscriberData: SubscriberData = {
        name: req.body.name,
        url: req.body.url,
        pipeline_id: pipelineId,
      };
      const subscriber = await createSubscriber(SubscriberData);
      res.status(201).send(subscriber);
    } catch (err) {
      next(err);
    }
  },
);

subscriberRouter.delete(
  "/:subscriberId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subscriberID = Array.isArray(req.params.subscriberId)
        ? req.params.subscriberId[0]
        : req.params.subscriberId;
      if (!subscriberID) {
        throw new BadRequestError("Invalid Format");
      }
      const existing = await getSubscriberById(subscriberID);
      if (!existing) {
        throw new NotFoundError("Subscriber not found");
      }
      const subscriber = await deleteSubscriberById(subscriberID);
      res.status(200).send(subscriber);
    } catch (err) {
      next(err);
    }
  },
);

export { subscriberRouter };
