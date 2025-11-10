import { eq } from 'drizzle-orm';

import { db } from '@/lib/db/client';
import { contactMessages } from '@/lib/db/schema';

export function isUndefinedTableError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: string }).code;
  return code === '42P01';
}

export async function submitContactMessage({
  name,
  email,
  message
}: {
  name: string;
  email: string;
  message: string;
}) {
  const [record] = await db
    .insert(contactMessages)
    .values({ name, email, message })
    .returning();

  return record;
}

export async function resolveContactMessage(id: string) {
  const [record] = await db
    .update(contactMessages)
    .set({ isResolved: true, resolvedAt: new Date() })
    .where(eq(contactMessages.id, id))
    .returning();

  return record;
}
