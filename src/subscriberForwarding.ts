import { ActionsResultPayload } from "./actions.js";
import { InferSelectModel } from "drizzle-orm";
import { subscribersTable } from "./db/schema.js";
import { generateSignature } from "./middlewares/webhookSignitureValidation.js";

type subscriber = InferSelectModel<typeof subscribersTable>;

export async function subscriberForwarding(
  processedPayload: ActionsResultPayload,
  subscriber: subscriber,
) {
  const body = JSON.stringify(processedPayload);
  const signature = generateSignature(body, subscriber.signing_secret);

  const response = await fetch(subscriber.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Signature": signature,
    },
    body: JSON.stringify(processedPayload),
  });
  return response.ok;
}
