import {
  ActionsResultPayload,
  addEventId,
  redact,
  Actions,
  convertDatesToISO,
} from "./actions.js";
import {
  returnQueuedjob,
  jobRetry,
  jobSent,
} from "./db/queries/jobs.js";
import { getSubscriberById } from "./db/queries/subscribers.js";
import { BadRequestError } from "./errors.js";
import { subscriberForwarding } from "./subscriberForwarding.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function worker() {
  let job;
  while (true) {
    job = await returnQueuedjob();
    if (!job) {
      await sleep(1000);
      continue;
    }
    try {
      const payload: Record<string, unknown> = job.payload;
      if (
        typeof payload !== "object" ||
        payload === null ||
        Array.isArray(payload)
      ) {
        throw new BadRequestError("Invalid Format");
      }
      const subscriberId = job.subscriber_id;
      const subscriber = await getSubscriberById(subscriberId!);
      const processed_payload = await processing(payload, subscriber.action);
      if (processed_payload) {
        const response = await subscriberForwarding(processed_payload, subscriber)
        if (response) {
          await jobSent(processed_payload,job.id);
        }
        else {
          await jobRetry(processed_payload,job.id);
        }
      }
    } catch (error) {
      console.error(`Job ${job.id} error:`, error);
      await jobRetry({},job.id);
    }
  }
}

export async function processing(
  payload: Record<string, unknown>,
  action: string,
): Promise<ActionsResultPayload> {
  if (!Actions.includes(action)) {
    throw new BadRequestError(`Invalid action: ${action}`);
  }
  switch (action) {
    case "convertDatesToISO":
      return convertDatesToISO(payload);
    case "add_event_id":
      return addEventId(payload);
    case "redact":
      return redact(payload);
    default:
      throw new BadRequestError(`Invalid action: ${action}`);
  }
}