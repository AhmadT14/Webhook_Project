import { returnQueuedjob, changeStatus } from "./db/queries/jobs.js";
import { getPipelineById } from "./db/queries/pipelines.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
type Payload = {
  order_id: string;
  items: { item: string; price: number };
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
      const processedPayload = await processing(payload, actions);
    } catch (err) {
      console.log(err);
    }
  }
}

export async function processing(payload: Payload, actions: string) {}
