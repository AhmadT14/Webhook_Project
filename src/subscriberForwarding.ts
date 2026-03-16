import { ActionsResultPayload } from "./actions.js";
import { jobAttemptsCount } from "./db/queries/jobs.js";
import {
  addToHistory,
  getSubscriberStatusBySubscriberId,
} from "./db/queries/deliverAttempts.js";
import { InferSelectModel } from "drizzle-orm";
import { subscribersTable } from "./db/schema.js";

type Subscriber = InferSelectModel<typeof subscribersTable>;

export async function subscribersForwarding(
  processedPayload: ActionsResultPayload,
  jobId: string,
  subscribers: Subscriber[],
): Promise<boolean[]> {
  const responses: boolean[] = [];
  for (let row = 0; row < subscribers.length; row++) {
    try {
      const record = await getSubscriberStatusBySubscriberId(
        jobId,
        subscribers[row].id,
      );
      if (!record || record.subscriber_attempt_status === "failed") {
        const response = await fetch(subscribers[row].url, {
          method: "POST",
          body: JSON.stringify(processedPayload),
          headers: { "Content-Type": "application/json" },
        });
        responses.push(response.ok);
        if (response.ok) {
          await addToHistory({
            job_id: jobId,
            subscriber_id: subscribers[row].id,
            subscriber_attempt_status: "sent",
            attempt_no: (await jobAttemptsCount(jobId)).attempts! + 1,
          });
        } else {
          await addToHistory({
            job_id: jobId,
            subscriber_id: subscribers[row].id,
            attempt_no: (await jobAttemptsCount(jobId)).attempts! + 1,
          });
        }
      } else {
        responses.push(true);
      }
    } catch (err) {
      await addToHistory({
        job_id: jobId,
        subscriber_id: subscribers[row].id,
        attempt_no: (await jobAttemptsCount(jobId)).attempts! + 1,
      });
      console.error(`Failed to forward to ${subscribers[row].url}:`, err);
      responses.push(false);
    }
  }
  return responses;
}
