import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';

import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';

export async function GET() {
  const records = await db
    .select({ id: users.id, name: users.name, image: users.image, createdAt: users.createdAt })
    .from(users)
    .orderBy(desc(users.createdAt));

  return NextResponse.json({ accounts: records });
}
