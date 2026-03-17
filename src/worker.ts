import {
  ActionsResultPayload,
  uppercase,
  addEventId,
  redact,
  Actions,
} from "./actions.js";
import {
  returnQueuedjob,
  changeJobStatus,
  jobSent,
  jobRetry,
  jobAttemptsCount,
} from "./db/queries/jobs.js";
import { getPipelineById } from "./db/queries/pipelines.js";
import { BadRequestError } from "./errors.js";
import { getSubscribersByPipelineId } from "./db/queries/subscribers.js";
import { subscribersForwarding } from "./subscriberForwarding.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export type Payload = Record<string, unknown>;

export async function worker() {
  let job;
  while (true) {
    job = await returnQueuedjob();
    if (!job) {
      await sleep(1000);
      continue;
    }
    try {
      const payload: Payload = JSON.parse(job.payload);
      if (
        typeof payload !== "object" ||
        payload === null ||
        Array.isArray(payload)
      ) {
        throw new BadRequestError("Invalid Format");
      }
      const pipelineId = job.pipeline_id;
      const pipeline = await getPipelineById(pipelineId!);
      if (!pipeline) {
        await changeJobStatus("failed", job.id);
        console.error(`Pipeline ${pipelineId} not found for job ${job.id}`);
        continue;
      }
      const actions = pipeline.actions;
      if (!pipeline.actions) {
        await changeJobStatus("failed", job.id);
        console.error(`Pipeline ${pipelineId} has no actions`);
        continue;
      }
      await changeJobStatus("processing", job.id);
      const processedPayload = await payloadBuilder(payload, actions);
      const subscribers = await getSubscribersByPipelineId(pipelineId!);
      if (subscribers.length === 0) {
        await changeJobStatus("no_subscribers", job.id);
        continue;
      }
      const responses = await subscribersForwarding(
        processedPayload,
        job.id,
        subscribers,
      );
      const allSucceeded = responses.every((r) => r === true);
      if (allSucceeded) {
        await changeJobStatus("sent", job.id);
        await jobSent(job.id);
      } else {
        throw new Error("Some subscribers failed to receive message");
      }
    } catch (error) {
      console.error(`Job ${job.id} error:`, error);
      if (error instanceof BadRequestError) {
        await changeJobStatus("failed", job.id);
      } else {
        const attempts = await jobAttemptsCount(job.id);
        if (attempts.attempts! > 5) {
          await changeJobStatus("failed", job.id);
        } else {
          await changeJobStatus("queued", job.id);
          await jobRetry(job.id);
        }
      }
    }
  }
}

export async function processing(
  payload: Payload,
  action: string,
): Promise<ActionsResultPayload> {
  if (!Actions.includes(action)) {
    throw new BadRequestError(`Invalid action: ${action}`);
  }
  switch (action) {
    case "uppercase":
      return uppercase(payload);
    case "add_event_id":
      return addEventId(payload);
    case "redact":
      return redact(payload);
    default:
      throw new BadRequestError(`Invalid action: ${action}`);
  }
}

async function payloadBuilder(
  payload: Payload,
  actions: string,
): Promise<ActionsResultPayload> {
  return processing(payload, actions);
}

await worker();
