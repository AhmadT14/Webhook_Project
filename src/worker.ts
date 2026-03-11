import {
  ActionsResultPayload,
  gradesAverage,
  gradesMax,
  gradesMin,
  gradesSum,
  actions,
} from "./actions.js";
import { returnQueuedjob, changeStatus, sent, retry, returnAttemptsount } from "./db/queries/jobs.js";
import { getPipelineById } from "./db/queries/pipelines.js";
import { getSubscribersUrlsByPipelineId } from "./db/queries/subscribers.js";

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
      const pipelineId = job.pipeline_id;
      const pipeline = await getPipelineById(pipelineId!);
      const actions = pipeline.actions;
      await changeStatus("processing", job.id);
      const processedPayload = await payloadBuilder(payload, actions);
      const res = await subscribersForwarding(processedPayload, pipelineId!);
      if (res) {
        await changeStatus("sent", job.id);
        await sent(job.id);
      } else {
        const attempts=await returnAttemptsount(job.id)
        if(attempts.attempts!>5)
        {
          await changeStatus("failed", job.id);
          return
        }
        await changeStatus("queued", job.id);
        await retry(job.id);
      }
    } catch (err) {
      console.log(err);
    }
  }
}

export async function processing(
  payload: Payload,
  action: string,
): Promise<number | void> {
  if (!(action in actions)) {
    return;
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
) {
  try {
    const urls = await getSubscribersUrlsByPipelineId(pipelineId);
    for (const url of urls) {
      const response = await fetch(url.url, {
        method: "POST",
        body: JSON.stringify(processedPayload),
      });
      return response.ok;
    }
  } catch (error) {
    console.error(error);
  }
}

async function payloadBuilder(
  payload: Payload,
  actions: string,
): Promise<ActionsResultPayload> {
  const answer = await processing(payload, actions);
  return { student: payload.student, result: answer! };
}
