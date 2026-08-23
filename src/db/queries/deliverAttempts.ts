import { db } from "../index.js";
import { eq } from "drizzle-orm";
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

export async function addDeliveryAttempt(data: {
  job_id: string;
  attempt_status?: string;
  attempt_no: number;
  payload: Record<string, unknown>;
}) {
  const result = await db
    .insert(deliveryAttemptsTable)
    .values(data)
    .returning();
  return result;
}
