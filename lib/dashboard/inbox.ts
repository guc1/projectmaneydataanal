import { desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db/client';
import { dashboardInboxMessages } from '@/lib/db/schema';

export async function listInboxMessages(status?: string) {
  if (!status) {
    return await db
      .select()
      .from(dashboardInboxMessages)
      .orderBy(desc(dashboardInboxMessages.createdAt));
  }

  return await db
    .select()
    .from(dashboardInboxMessages)
    .where(eq(dashboardInboxMessages.status, status))
    .orderBy(desc(dashboardInboxMessages.createdAt));
}

export async function addInboxMessage({
  subject,
  body,
  senderName,
  senderEmail
}: {
  subject: string;
  body: string;
  senderName?: string | null;
  senderEmail?: string | null;
}) {
  const [created] = await db
    .insert(dashboardInboxMessages)
    .values({ subject, body, senderName: senderName ?? null, senderEmail: senderEmail ?? null })
    .returning();

  return created;
}

export async function updateInboxStatus(id: string, status: string) {
  const [updated] = await db
    .update(dashboardInboxMessages)
    .set({ status })
    .where(eq(dashboardInboxMessages.id, id))
    .returning();

  return updated;
}

export async function deleteInboxMessage(id: string) {
  await db.delete(dashboardInboxMessages).where(eq(dashboardInboxMessages.id, id));
}
