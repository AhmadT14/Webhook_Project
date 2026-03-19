import { ActionsResultPayload } from "./actions.js";
import { jobAttemptsCount } from "./db/queries/jobs.js";
import {
  addDeliveryAttempt,
  getDeliveryAttemptsBySubscriberId,
} from "./db/queries/deliverAttempts.js";
import { InferSelectModel } from "drizzle-orm";
import { subscribersTable } from "./db/schema.js";
import { BadRequestError } from "./errors.js";

type Subscriber = InferSelectModel<typeof subscribersTable>;

export async function subscribersForwarding(
  processedPayload: ActionsResultPayload,
  jobId: string,
  subscribers: Subscriber[],
): Promise<boolean[]> {
  const responses: boolean[] = [];
  for (let row = 0; row < subscribers.length; row++) {
    try {
      const record = await getDeliveryAttemptsBySubscriberId(
        jobId,
        subscribers[row].id,
      );
      if (!record || record.attempt_status === "failed") {
        const response = await fetch(subscribers[row].url, {
          method: "POST",
          body: JSON.stringify(processedPayload),
          headers: { "Content-Type": "application/json" },
        });
        responses.push(response.ok);
        if (response.ok) {
          if (
            typeof processedPayload !== "object" ||
            processedPayload === null ||
            Array.isArray(processedPayload)
          ) {
            throw new BadRequestError("Invalid Format");
          }
          await addDeliveryAttempt({
            job_id: jobId,
            subscriber_id: subscribers[row].id,
            attempt_status: "sent",
            attempt_no: (await jobAttemptsCount(jobId)).attempts! + 1,
            processed_payload: processedPayload,
          });
        } else {
          if (
            typeof processedPayload !== "object" ||
            processedPayload === null ||
            Array.isArray(processedPayload)
          ) {
            throw new BadRequestError("Invalid Format");
          }
          await addDeliveryAttempt({
            job_id: jobId,
            subscriber_id: subscribers[row].id,
            attempt_no: (await jobAttemptsCount(jobId)).attempts! + 1,
            processed_payload: processedPayload,
          });
        }
      } else {
        responses.push(true);
      }
    } catch (err) {
      if (
        typeof processedPayload !== "object" ||
        processedPayload === null ||
        Array.isArray(processedPayload)
      ) {
        throw new BadRequestError("Invalid Format");
      }
      await addDeliveryAttempt({
        job_id: jobId,
        subscriber_id: subscribers[row].id,
        attempt_no: (await jobAttemptsCount(jobId)).attempts! + 1,
        processed_payload: processedPayload,
      });
      console.error(`Failed to forward to ${subscribers[row].url}:`, err);
      responses.push(false);
    }
  }
  return responses;
}
