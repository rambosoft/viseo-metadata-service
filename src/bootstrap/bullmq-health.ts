import type { Queue, QueueEvents } from "bullmq";

export async function isBullMqHealthy(
  queueLike: Pick<Queue, "client"> | Pick<QueueEvents, "client">,
): Promise<boolean> {
  try {
    const client = await queueLike.client;
    const result = await client.ping();
    return result === "PONG";
  } catch {
    return false;
  }
}
