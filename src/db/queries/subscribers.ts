import { db } from "../index.js";
import { eq } from "drizzle-orm";
import { subscribersTable } from "../schema.js";

export async function getSubscribersByPipelineId(pipelineId: string) {
  const result = await db
    .select()
    .from(subscribersTable)
    .where(eq(subscribersTable.pipeline_id, pipelineId));
  return result;
}

export async function getSubscriberById(id: string) {
  const [result] = await db
    .select()
    .from(subscribersTable)
    .where(eq(subscribersTable.id, id));
  return result;
}

export async function getSubscriberByURL(url: string) {
  const [result] = await db
    .select()
    .from(subscribersTable)
    .where(eq(subscribersTable.url, url));
  return result;
}

export async function createSubscriber(data: {
  name: string;
  pipeline_id: string;
  url: string;
}) {
  const [result] = await db.insert(subscribersTable).values(data).returning();
  return result;
}

export async function updateSubscriber(data: {
  name: string;
  pipeline_id: string;
  url: string;
}) {
  const [result] = await db.insert(subscribersTable).values(data).returning();
  return result;
}

export async function deleteSubscriberById(id: string) {
  const result = await db
    .delete(subscribersTable)
    .where(eq(subscribersTable.id, id));
  return result;
}

export async function updateSubscriberById(
  id: string,
  data: Partial<{ name: string; url: string }>,
) {
  const [result] = await db
    .update(subscribersTable)
    .set(data)
    .where(eq(subscribersTable.id, id))
    .returning();
  return result;
}
