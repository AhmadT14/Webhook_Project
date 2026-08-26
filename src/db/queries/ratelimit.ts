import { db } from "../index.js";
import { webhookRequestsTable } from "../schema.js";
import { and, eq, gte, sql } from "drizzle-orm";

export async function checkAndRecordRequest(
    pipelineId: string,
    limitPerMin: number,
): Promise<{ allowed: boolean; count: number }> {
    return db.transaction(async (tx) => {
        const [{ count }] = await tx
            .select({ count: sql<number>`count(*)::int` })
            .from(webhookRequestsTable)
            .where(
                and(
                    eq(webhookRequestsTable.pipeline_id, pipelineId),
                    gte(webhookRequestsTable.requested_at, sql`now() - interval '1 minute'`),
                ),
            );

        if (count >= limitPerMin) {
            return { allowed: false, count };
        }

        await tx.insert(webhookRequestsTable).values({ pipeline_id: pipelineId });
        await tx
            .delete(webhookRequestsTable)
            .where(
                and(
                    eq(webhookRequestsTable.pipeline_id, pipelineId),
                    sql`${webhookRequestsTable.requested_at} < now() - interval '2 minutes'`,
                ),
            );
        return { allowed: true, count: count + 1 };
    });
}