import express, { Request, Response } from "express";
import {
  getAllSubscribers,
  getSubscriberById,
  createSubscriber,
  deleteSubscriberById,
} from "../db/queries/subscribers.js";

const subscriberRouter = express.Router();

subscriberRouter.get("/", async (req: Request, res: Response) => {
  try {
    const pipelines = await getAllSubscribers();
    if (!pipelines) {
      console.error("No Pipelines in system");
      return;
    }
    res.status(200).send(pipelines);
  } catch (err) {
    console.log(err);
  }
});

subscriberRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const subscriberId = req.params.id[0];
    const subscriber = await getSubscriberById(subscriberId);
    if (!subscriber) {
      console.error("Subscriber not found");
      return;
    }
    res.status(200).send(subscriber);
  } catch (err) {
    console.log(err);
  }
});

subscriberRouter.post("/", async (req: Request, res: Response) => {
  type SubscriberData = {
    name: string;
    pipeline_id: string;
    url: string;
  };
  try {
    const pipelineId = req.params.pipeline_id[0];
    const SubscriberData: SubscriberData = {
      name: req.body.name,
      url: req.body.url,
      pipeline_id: pipelineId,
    };
    const subscriber = await createSubscriber(SubscriberData);
    res.status(201).send(subscriber);
  } catch (err) {
    console.log(err);
  }
});

subscriberRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const subscriberId = req.params.id[0];
    const subscriber = await deleteSubscriberById(subscriberId);
    res.status(200).send(subscriber);
  } catch (err) {
    console.log(err);
  }
});

export { subscriberRouter };
