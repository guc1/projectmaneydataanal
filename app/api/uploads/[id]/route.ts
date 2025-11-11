import { unlink } from 'node:fs/promises';
import path from 'node:path';

import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { uploadEntries } from '@/lib/db/schema';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const uploadId = params.id;

  const [record] = await db
    .select({
      id: uploadEntries.id,
      filePath: uploadEntries.filePath
    })
    .from(uploadEntries)
    .where(eq(uploadEntries.id, uploadId))
    .limit(1);

  if (!record) {
    return NextResponse.json({ error: 'Upload not found.' }, { status: 404 });
  }

  if (record.filePath) {
    const absolutePath = path.join(process.cwd(), record.filePath);
    try {
      await unlink(absolutePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('Failed to delete upload file', error);
      }
    }
  }

  await db.delete(uploadEntries).where(eq(uploadEntries.id, uploadId));

  return NextResponse.json({ success: true });
}
