import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/lib/db/client';
import { ensureAuthSchema } from '@/lib/db/ensure-auth-schema';
import { users } from '@/lib/db/schema';
import { env } from '@/lib/env';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb'
    }
  }
};

const AVATAR_CHOICES = [
  '🧠',
  '🚀',
  '📈',
  '🛡️',
  '🧮',
  '🛰️',
  '📊',
  '🔍'
] as const;

const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters long')
    .max(80, 'Name must be 80 characters or less'),
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters long')
    .max(32, 'Username must be 32 characters or less')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores.'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  avatar: z.enum(AVATAR_CHOICES),
  staffCode: z.string().min(1, 'Staff code is required')
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { name, username, password, avatar, staffCode } = parsed.data;

  if (staffCode !== env.STAFF_ACCESS_CODE) {
    return NextResponse.json({ error: 'Invalid access code.' }, { status: 401 });
  }

  const normalizedUsername = username.toLowerCase();

  await ensureAuthSchema(db);

  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, normalizedUsername))
    .limit(1);

  if (existingUser) {
    return NextResponse.json({ error: 'Username is already taken.' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const inserted = await db
    .insert(users)
    .values({
      name,
      username: normalizedUsername,
      passwordHash,
      image: avatar
    })
    .returning({ id: users.id, name: users.name, image: users.image, username: users.username });

  const user = inserted[0];

  return NextResponse.json({ user }, { status: 201 });
}
