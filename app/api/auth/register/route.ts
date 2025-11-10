import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { hash } from 'bcryptjs';
import { z } from 'zod';

import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { env } from '@/lib/env';

const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters long')
    .max(32, 'Username must be at most 32 characters long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Username can only contain letters, numbers, dots, underscores, and hyphens.'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  image: z
    .string()
    .min(1, 'Profile image is required')
    .refine(
      (value) => value.startsWith('data:image/png;base64,'),
      'Profile image must be a PNG image.'
    ),
  staffCode: z.string().min(1, 'Staff code is required')
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { username, password, image, staffCode } = parsed.data;

  if (staffCode !== env.STAFF_ACCESS_CODE) {
    return NextResponse.json({ error: 'Invalid access code.' }, { status: 401 });
  }

  const trimmedUsername = username.trim();
  const normalizedUsername = trimmedUsername.toLowerCase();

  if (!trimmedUsername) {
    return NextResponse.json({ error: 'Username cannot be blank.' }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, normalizedUsername))
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: 'Username is already taken.' }, { status: 409 });
  }

  const passwordHash = await hash(password, 12);

  const inserted = await db
    .insert(users)
    .values({
      username: normalizedUsername,
      name: trimmedUsername,
      image,
      passwordHash
    })
    .returning({ id: users.id, name: users.name, image: users.image, username: users.username });

  const user = inserted[0];

  if (!user) {
    return NextResponse.json({ error: 'Unable to create user.' }, { status: 500 });
  }

  return NextResponse.json({ user }, { status: 201 });
}
