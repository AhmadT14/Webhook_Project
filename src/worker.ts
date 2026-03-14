import {
  ActionsResultPayload,
  gradesAverage,
  gradesMax,
  gradesMin,
  gradesSum,
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
export type Payload = {
  student: string;
  subject: string;
  grades: number[];
};

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
      if (!payload.student || !payload.subject || !payload.grades) {
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
): Promise<number | void> {
  if (!Actions.includes(action)) {
    throw new BadRequestError(`Invalid action: ${action}`);
  }
  switch (action) {
    case "average":
      return gradesAverage(payload);
    case "sum":
      return gradesSum(payload);
    case "max":
      return gradesMax(payload);
    case "min":
      return gradesMin(payload);
  }
}

async function payloadBuilder(
  payload: Payload,
  actions: string,
): Promise<ActionsResultPayload> {
  const answer = await processing(payload, actions);
  return { student: payload.student, result: answer! };
}

await worker();
