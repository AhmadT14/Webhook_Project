import { returnQueuedjob, changeStatus } from "./db/queries/jobs.js";
import { getPipelineById } from "./db/queries/pipelines.js";
import { getSubscribersUrlsbyPipelineId } from "./db/queries/subscribers.js";

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
      const processedPayload: string = await processing(payload, actions);
      const res = await subscribersForwarding(processedPayload, pipelineId!);
      if (res) {
        await changeStatus("sent", job.id);
      } else await changeStatus("failed", job.id);
    } catch (err) {
      console.log(err);
    }
  }
}

export async function processing(payload: Payload, actions: string) :Promise<string> {
  switch (actions) {
    case "action1":
      return ""
    case "action2":
      return ""
    case "action3":
      return ""
  }
  return ""
}

export async function subscribersForwarding(
  processedPayload: string,
  pipelineId: string,
) {
  try {
    const urls = await getSubscribersUrlsbyPipelineId(pipelineId);
    for(const url of urls) {
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
