import { eq } from 'drizzle-orm';

import { db } from '@/lib/db/client';
import { outreachPages } from '@/lib/db/schema';

export async function getPublishedOutreachPages() {
  return db
    .select()
    .from(outreachPages)
    .where(eq(outreachPages.published, true))
    .orderBy(outreachPages.createdAt);
}

export async function getOutreachPageBySlug(slug: string) {
  const [page] = await db
    .select()
    .from(outreachPages)
    .where(eq(outreachPages.slug, slug))
    .limit(1);

  return page ?? null;
}

export async function upsertOutreachPage({
  id,
  slug,
  title,
  hero,
  content,
  published
}: {
  id?: string;
  slug: string;
  title: string;
  hero?: string | null;
  content: string;
  published: boolean;
}) {
  if (id) {
    const [updated] = await db
      .update(outreachPages)
      .set({ slug, title, hero: hero ?? null, content, published })
      .where(eq(outreachPages.id, id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(outreachPages)
    .values({ slug, title, hero: hero ?? null, content, published })
    .returning();

  return created;
}
