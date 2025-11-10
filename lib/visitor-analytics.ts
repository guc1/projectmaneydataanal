import { eq } from 'drizzle-orm';

import { db } from '@/lib/db/client';
import { visitorSessions } from '@/lib/db/schema';

export async function trackVisitorSession({
  sessionId,
  referrer,
  utmCampaign
}: {
  sessionId: string;
  referrer?: string | null;
  utmCampaign?: string | null;
}) {
  const [existing] = await db
    .select()
    .from(visitorSessions)
    .where(eq(visitorSessions.sessionId, sessionId))
    .limit(1);

  if (existing) {
    await db
      .update(visitorSessions)
      .set({
        lastSeenAt: new Date(),
        pageViews: existing.pageViews + 1,
        referrer: referrer ?? existing.referrer,
        utmCampaign: utmCampaign ?? existing.utmCampaign
      })
      .where(eq(visitorSessions.id, existing.id));
    return { ...existing, pageViews: existing.pageViews + 1 };
  }

  const [created] = await db
    .insert(visitorSessions)
    .values({
      sessionId,
      referrer: referrer ?? null,
      utmCampaign: utmCampaign ?? null
    })
    .returning();

  return created;
}

export async function getVisitorSummary() {
  const rows = await db.select().from(visitorSessions);
  const totalVisitors = rows.length;
  const totalPageViews = rows.reduce((acc, row) => acc + (row.pageViews ?? 0), 0);
  return {
    totalVisitors,
    totalPageViews
  };
}
