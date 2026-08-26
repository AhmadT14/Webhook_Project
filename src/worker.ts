import {
  ActionsResultPayload,
  addEventId,
  redact,
  Actions,
  convertDatesToISO,
} from "./actions.js";
import { claimNextJob, jobRetry, jobSent } from "./db/queries/jobs.js";
import { getSubscriberById } from "./db/queries/subscribers.js";
import { getPipelineById } from "./db/queries/pipelines.js";
import { BadRequestError } from "./errors.js";
import { subscriberForwarding } from "./subscriberForwarding.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function worker() {
  while (true) {
    const job = await claimNextJob();
    if (!job) {
      await sleep(1000);
      continue;
    }

    try {
      const payload = job.payload;
      if (
        typeof payload !== "object" ||
        payload === null ||
        Array.isArray(payload)
      ) {
        throw new BadRequestError("Invalid Format");
      }

      const subscriber = job.subscriber_id
        ? await getSubscriberById(job.subscriber_id)
        : undefined;
      if (!subscriber) {
        console.error(`Job ${job.id} has no valid subscriber`);
        await jobRetry({}, job.id);
        continue;
      }

      const pipeline = job.pipeline_id
        ? await getPipelineById(job.pipeline_id)
        : undefined;
      if (!pipeline) {
        console.error(`Job ${job.id} has no valid pipeline`);
        await jobRetry({}, job.id);
        continue;
      }

      const processed_payload = await processing(payload, pipeline.action);
      const delivered = await subscriberForwarding(
        processed_payload,
        subscriber,
      );

      if (delivered) {
        await jobSent(processed_payload, job.id);
      } else {
        await jobRetry(processed_payload, job.id);
      }
    } catch (error) {
      console.error(`Job ${job.id} error:`, error);
      await jobRetry({}, job.id);
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