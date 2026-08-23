import { ActionsResultPayload } from "./actions.js";
import { InferSelectModel } from "drizzle-orm";
import { subscribersTable } from "./db/schema.js";

type subscriber = InferSelectModel<typeof subscribersTable>;

export async function subscriberForwarding(
  processedPayload: ActionsResultPayload,
  subscriber: subscriber,
){
  const response = await fetch(subscriber.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(processedPayload),
  });
  return response.ok;
}
