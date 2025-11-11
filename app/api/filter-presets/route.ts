import { desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { filterPresetChains, filterPresets, users } from '@/lib/db/schema';
import type {
  FilterTemplatePayload,
  PresetAuthor,
  SavedPresetChainRecord,
  SavedPresetRecord
} from '@/lib/filter-presets/types';

const filterTemplateSchema = z.object({
  columnKey: z.string().min(1),
  columnLabel: z.string().min(1),
  dataType: z.string().min(1),
  operator: z.object({
    type: z.string().min(1),
    operator: z.string().min(1)
  }),
  value: z.union([z.string(), z.number(), z.tuple([z.number(), z.number()])]),
  description: z.string().max(500).nullable().optional()
});

const createSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('single'),
    name: z.string().min(1).max(120),
    template: filterTemplateSchema
  }),
  z.object({
    type: z.literal('chain'),
    name: z.string().min(1).max(120),
    templates: z.array(filterTemplateSchema).min(1)
  })
]);

const mapAuthor = (row: { id: string; name: string | null; image: string | null }): PresetAuthor => ({
  id: row.id,
  name: row.name,
  image: row.image
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const authorFilter = url.searchParams.get('userId');

  let presetsQuery = db
    .select({
      id: filterPresets.id,
      name: filterPresets.name,
      template: filterPresets.template,
      createdAt: filterPresets.createdAt,
      authorId: users.id,
      authorName: users.name,
      authorImage: users.image
    })
    .from(filterPresets)
    .innerJoin(users, eq(filterPresets.createdByUserId, users.id));

  if (authorFilter && authorFilter !== 'all') {
    presetsQuery = presetsQuery.where(eq(filterPresets.createdByUserId, authorFilter));
  }

  const presetRows = await presetsQuery.orderBy(desc(filterPresets.createdAt));

  let chainsQuery = db
    .select({
      id: filterPresetChains.id,
      name: filterPresetChains.name,
      templates: filterPresetChains.templates,
      createdAt: filterPresetChains.createdAt,
      authorId: users.id,
      authorName: users.name,
      authorImage: users.image
    })
    .from(filterPresetChains)
    .innerJoin(users, eq(filterPresetChains.createdByUserId, users.id));

  if (authorFilter && authorFilter !== 'all') {
    chainsQuery = chainsQuery.where(eq(filterPresetChains.createdByUserId, authorFilter));
  }

  const chainRows = await chainsQuery.orderBy(desc(filterPresetChains.createdAt));

  const presets: SavedPresetRecord[] = presetRows.map((row) => ({
    id: row.id,
    name: row.name,
    template: row.template as FilterTemplatePayload,
    createdAt: row.createdAt.toISOString(),
    createdBy: mapAuthor({ id: row.authorId, name: row.authorName, image: row.authorImage })
  }));

  const chains: SavedPresetChainRecord[] = chainRows.map((row) => ({
    id: row.id,
    name: row.name,
    templates: row.templates as FilterTemplatePayload[],
    createdAt: row.createdAt.toISOString(),
    createdBy: mapAuthor({ id: row.authorId, name: row.authorName, image: row.authorImage })
  }));

  const authorMap = new Map<string, PresetAuthor>();
  for (const preset of presets) {
    authorMap.set(preset.createdBy.id, preset.createdBy);
  }
  for (const chain of chains) {
    authorMap.set(chain.createdBy.id, chain.createdBy);
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

  return NextResponse.json({ presets, chains, authors });
}

export async function POST(request: Request) {
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

  const parsed = createSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const author: PresetAuthor = {
    id: session.user.id,
    name: session.user.name ?? null,
    image: session.user.image ?? null
  };

  if (parsed.data.type === 'single') {
    const [record] = await db
      .insert(filterPresets)
      .values({
        name: parsed.data.name,
        template: parsed.data.template satisfies FilterTemplatePayload,
        createdByUserId: session.user.id
      })
      .returning({
        id: filterPresets.id,
        name: filterPresets.name,
        template: filterPresets.template,
        createdAt: filterPresets.createdAt
      });

    const preset: SavedPresetRecord = {
      id: record.id,
      name: record.name,
      template: record.template as FilterTemplatePayload,
      createdAt: record.createdAt.toISOString(),
      createdBy: author
    };

    return NextResponse.json({ preset }, { status: 201 });
  }

  const [record] = await db
    .insert(filterPresetChains)
    .values({
      name: parsed.data.name,
      templates: parsed.data.templates as FilterTemplatePayload[],
      createdByUserId: session.user.id
    })
    .returning({
      id: filterPresetChains.id,
      name: filterPresetChains.name,
      templates: filterPresetChains.templates,
      createdAt: filterPresetChains.createdAt
    });

  const chain: SavedPresetChainRecord = {
    id: record.id,
    name: record.name,
    templates: record.templates as FilterTemplatePayload[],
    createdAt: record.createdAt.toISOString(),
    createdBy: author
  };

  return NextResponse.json({ chain }, { status: 201 });
}
