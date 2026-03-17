import { db } from "../index.js";
import { eq, desc, and } from "drizzle-orm";
import { deliveryAttemptsTable, jobsTable } from "../schema.js";

export async function getFullDeliveryAttempts() {
  const result = await db.select().from(deliveryAttemptsTable);
  return result;
}

export async function getDeliveryAttemptsByJobId(jobId: string) {
  const result = await db
    .select()
    .from(deliveryAttemptsTable)
    .where(eq(deliveryAttemptsTable.job_id, jobId));
  return result;
}

export async function getDeliveryAttemptsBySubscriberId(
  jobId: string,
  subscriberId: string,
) {
  const [result] = await db
    .select()
    .from(deliveryAttemptsTable)
    .where(
      and(
        eq(deliveryAttemptsTable.subscriber_id, subscriberId),
        eq(deliveryAttemptsTable.job_id, jobId),
      ),
    )
    .orderBy(desc(deliveryAttemptsTable.attempt_no));
  return result;
}

export async function addDeliveryAttempt(data: {
  job_id: string;
  subscriber_id: string;
  subscriber_attempt_status?: string;
  attempt_no: number;
}) {
  const result = await db
    .insert(deliveryAttemptsTable)
    .values(data)
    .returning();
  return result;
}
