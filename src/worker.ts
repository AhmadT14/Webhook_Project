import {
  ActionsResultPayload,
  gradesAverage,
  gradesMax,
  gradesMin,
  gradesSum,
  actions,
} from "./actions.js";
import {
  returnQueuedjob,
  changeStatus,
  sent,
  retry,
  returnAttemptsount,
} from "./db/queries/jobs.js";
import { getPipelineById } from "./db/queries/pipelines.js";
import { getSubscribersUrlsByPipelineId } from "./db/queries/subscribers.js";
import { BadRequestError } from "./errors.js";

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
        await changeStatus("failed", job.id);
        console.error(`Pipeline ${pipelineId} not found for job ${job.id}`);
        continue;
      }
      const actions = pipeline.actions;
      if (!pipeline.actions) {
        await changeStatus("failed", job.id);
        console.error(`Pipeline ${pipelineId} has no actions`);
        continue;
      }
      await changeStatus("processing", job.id);
      const processedPayload = await payloadBuilder(payload, actions);
      const responses = await subscribersForwarding(
        processedPayload,
        pipelineId!,
      );
      const allSucceeded = responses.every((r) => r === true);
      if (allSucceeded) {
        await changeStatus("sent", job.id);
        await sent(job.id);
      } else {
        throw new Error("Some subscribers failed to receive message");
      }
    } catch (error) {
      console.error(`Job ${job.id} error:`, error);
      if (error instanceof BadRequestError) {
        await changeStatus("failed", job.id);
      } else {
        const attempts = await returnAttemptsount(job.id);
        if (attempts.attempts! > 5) {
          await changeStatus("failed", job.id);
        } else {
          await changeStatus("queued", job.id);
          await retry(job.id);
        }
      }
    }
  }
}

export async function processing(
  payload: Payload,
  action: string,
): Promise<number | void> {
  if (!(action in actions)) {
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

export async function subscribersForwarding(
  processedPayload: ActionsResultPayload,
  pipelineId: string,
): Promise<boolean[]> {
  const urls = await getSubscribersUrlsByPipelineId(pipelineId);
  const responses: boolean[] = [];

  for (const url of urls) {
    try {
      const response = await fetch(url.url, {
        method: "POST",
        body: JSON.stringify(processedPayload),
      });
      responses.push(response.ok);
    } catch (err) {
      console.error(`Failed to forward to ${url.url}:`, err);
      responses.push(false);
    }
  }

  return responses;
}

async function payloadBuilder(
  payload: Payload,
  actions: string,
): Promise<ActionsResultPayload> {
  const answer = await processing(payload, actions);
  return { student: payload.student, result: answer! };
}

await worker();
