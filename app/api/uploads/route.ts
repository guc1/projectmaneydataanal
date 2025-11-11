import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { SQL, and, desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { uploadEntries, uploadSelections, users } from '@/lib/db/schema';

const uploadSchema = z.object({
  buttonKey: z.string().min(1, 'Upload target is required'),
  description: z.string().max(500).optional()
});

const uploadsRoot = path.join(process.cwd(), 'data', 'uploads');

const selectionSchema = z.object({
  buttonKey: z.string().min(1, 'Upload target is required'),
  uploadId: z.string().uuid().optional(),
  select: z.boolean()
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const buttonKey = formData.get('buttonKey');
  const description = formData.get('description');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File upload missing.' }, { status: 400 });
  }

  const parsed = uploadSchema.safeParse({
    buttonKey: typeof buttonKey === 'string' ? buttonKey : '',
    description: typeof description === 'string' ? description : undefined
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const fileId = randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
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
      fileName: file.name,
      description: parsed.data.description,
      filePath: path.relative(process.cwd(), targetPath),
      uploadedByUserId: session.user.id
    })
    .returning();

  await db
    .insert(uploadSelections)
    .values({
      buttonKey: parsed.data.buttonKey,
      uploadId: record.id,
      userId: session.user.id
    })
    .onConflictDoUpdate({
      target: [uploadSelections.userId, uploadSelections.buttonKey],
      set: {
        uploadId: record.id,
        selectedAt: new Date()
      }
    });

  return NextResponse.json({ upload: record, selectedUploadId: record.id }, { status: 201 });
}

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const url = new URL(request.url);
  const scope = url.searchParams.get('scope') ?? 'all';
  const buttonKey = url.searchParams.get('buttonKey');
  const authorFilter = url.searchParams.get('userId');

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

  let whereClause: SQL<unknown> | undefined;

  if (scope === 'button' && buttonKey) {
    whereClause = eq(uploadEntries.buttonKey, buttonKey);
  }

  if (authorFilter && authorFilter !== 'all') {
    const userClause = eq(uploadEntries.uploadedByUserId, authorFilter);
    whereClause = whereClause ? and(whereClause, userClause) : userClause;
  }

  let rows;

  if (whereClause) {
    rows = await baseQuery.where(whereClause).orderBy(desc(uploadEntries.uploadedAt));
  } else {
    rows = await baseQuery.orderBy(desc(uploadEntries.uploadedAt));
  }

  let selectionRows: { buttonKey: string; uploadId: string }[] = [];

  if (userId) {
    selectionRows = await db
      .select({ buttonKey: uploadSelections.buttonKey, uploadId: uploadSelections.uploadId })
      .from(uploadSelections)
      .where(eq(uploadSelections.userId, userId));
  }

  const selectionMap = new Map<string, string>();
  for (const selection of selectionRows) {
    selectionMap.set(selection.buttonKey, selection.uploadId);
  }

  const uploads = rows.map((row) => ({
    ...row,
    isSelected: selectionMap.get(row.buttonKey) === row.id
  }));

  const selected = Object.fromEntries(selectionMap);

  const authorMap = new Map<string, { id: string; name: string | null; image: string | null }>();
  for (const row of rows) {
    if (!authorMap.has(row.userId)) {
      authorMap.set(row.userId, {
        id: row.userId,
        name: row.userName,
        image: row.userImage
      });
    }
  }

  const authors = Array.from(authorMap.values()).sort((a, b) => {
    const aName = a.name?.toLowerCase() ?? '';
    const bName = b.name?.toLowerCase() ?? '';
    if (aName && bName) {
      return aName.localeCompare(bName);
    }
    if (aName) return -1;
    if (bName) return 1;
    return 0;
  });

  return NextResponse.json({ uploads, selected, authors });
}

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const parsed = selectionSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { buttonKey, uploadId, select } = parsed.data;

  if (select) {
    if (!uploadId) {
      return NextResponse.json({ error: 'Upload ID is required to select a file.' }, { status: 400 });
    }

    const [target] = await db
      .select({ id: uploadEntries.id })
      .from(uploadEntries)
      .where(and(eq(uploadEntries.id, uploadId), eq(uploadEntries.buttonKey, buttonKey)))
      .limit(1);

    if (!target) {
      return NextResponse.json({ error: 'Upload not found for this slot.' }, { status: 404 });
    }

    await db
      .insert(uploadSelections)
      .values({
        buttonKey,
        uploadId: target.id,
        userId: session.user.id
      })
      .onConflictDoUpdate({
        target: [uploadSelections.userId, uploadSelections.buttonKey],
        set: {
          uploadId: target.id,
          selectedAt: new Date()
        }
      });

    return NextResponse.json({ selectedUploadId: target.id });
  }

  await db
    .delete(uploadSelections)
    .where(and(eq(uploadSelections.userId, session.user.id), eq(uploadSelections.buttonKey, buttonKey)));

  return NextResponse.json({ selectedUploadId: null });
}
