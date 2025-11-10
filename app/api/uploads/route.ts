import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { uploadEntries, users } from '@/lib/db/schema';

const uploadSchema = z.object({
  buttonKey: z.string().min(1, 'Upload target is required'),
  description: z.string().max(500).optional()
});

const uploadsRoot = path.join(process.cwd(), 'data', 'uploads');

const DEFAULT_FILE_NAME = 'upload.bin';

function isFileLike(value: unknown): value is Blob & { name?: string } {
  if (!value || typeof value !== 'object') {
    return false;
  }

  if ('arrayBuffer' in value && typeof (value as Blob).arrayBuffer === 'function') {
    return true;
  }

  return false;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const buttonKey = formData.get('buttonKey');
  const description = formData.get('description');

  if (!isFileLike(file)) {
    return NextResponse.json({ error: 'File upload missing.' }, { status: 400 });
  }

  const originalName = 'name' in file && typeof file.name === 'string' ? file.name : DEFAULT_FILE_NAME;

  const parsed = uploadSchema.safeParse({
    buttonKey: typeof buttonKey === 'string' ? buttonKey : '',
    description: typeof description === 'string' ? description : undefined
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const fileId = randomUUID();
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const targetDir = path.join(uploadsRoot, parsed.data.buttonKey);
  const targetPath = path.join(targetDir, `${fileId}-${safeName}`);

  await mkdir(targetDir, { recursive: true });
  const arrayBuffer = await file.arrayBuffer();
  await writeFile(targetPath, Buffer.from(arrayBuffer));

  const [record] = await db
    .insert(uploadEntries)
    .values({
      id: fileId,
      buttonKey: parsed.data.buttonKey,
      fileName: originalName,
      description: parsed.data.description,
      filePath: path.relative(process.cwd(), targetPath),
      uploadedByUserId: session.user.id
    })
    .returning();

  return NextResponse.json({ upload: record }, { status: 201 });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const scope = url.searchParams.get('scope') ?? 'all';
  const buttonKey = url.searchParams.get('buttonKey');

  const baseQuery = db
    .select({
      id: uploadEntries.id,
      fileName: uploadEntries.fileName,
      description: uploadEntries.description,
      buttonKey: uploadEntries.buttonKey,
      uploadedAt: uploadEntries.uploadedAt,
      filePath: uploadEntries.filePath,
      userId: uploadEntries.uploadedByUserId,
      userName: users.name,
      userImage: users.image
    })
    .from(uploadEntries)
    .innerJoin(users, eq(uploadEntries.uploadedByUserId, users.id));

  let rows;

  if (scope === 'button' && buttonKey) {
    rows = await baseQuery
      .where(eq(uploadEntries.buttonKey, buttonKey))
      .orderBy(desc(uploadEntries.uploadedAt));
  } else {
    rows = await baseQuery.orderBy(desc(uploadEntries.uploadedAt));
  }

  return NextResponse.json({ uploads: rows });
}
