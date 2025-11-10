import { NextResponse } from 'next/server';
import { z } from 'zod';

import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { env } from '@/lib/env';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long'),
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

  const { name, image, staffCode } = parsed.data;

  if (staffCode !== env.STAFF_ACCESS_CODE) {
    return NextResponse.json({ error: 'Invalid access code.' }, { status: 401 });
  }

  const inserted = await db
    .insert(users)
    .values({ name, image })
    .returning({ id: users.id, name: users.name, image: users.image });

  const user = inserted[0];

  return NextResponse.json({ user }, { status: 201 });
}
