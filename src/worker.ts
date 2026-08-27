import { addEventId, redact, Actions, convertDatesToISO } from "./actions.js";
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

      const processed_payload = processing(payload, pipeline.actions ?? []);
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

export function processing(
  payload: Record<string, unknown>,
  actions: string[],
): Record<string, unknown> {
  if (actions.length === 0) {
    throw new BadRequestError("Invalid action: pipeline has no actions");
  }

  let processedPayload = payload;
  for (const action of actions) {
    if (!Actions.includes(action)) {
      throw new BadRequestError(`Invalid action: ${action}`);
    }
    switch (action) {
      case "convertDatesToISO":
        processedPayload = convertDatesToISO(processedPayload);
        break;
      case "add_event_id":
        processedPayload = addEventId(processedPayload);
        break;
      case "redact":
        processedPayload = redact(processedPayload);
        break;
      default:
        throw new BadRequestError(`Invalid action: ${action}`);
    }
  }
  return processedPayload;
}
