import { desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { analysisPresetChains, analysisPresets, users } from '@/lib/db/schema';
import type {
  AnalysisChainPayload,
  AnalysisTemplatePayload,
  PresetAuthor,
  SavedAnalysisChainRecord,
  SavedAnalysisPresetRecord
} from '@/lib/analysis-presets/types';

const analysisOperatorSchema = z.enum(['+', '-', '*', '/']);

const analysisTemplateSchema = z.object({
  columnKey: z.string().min(1),
  columnLabel: z.string().min(1),
  dataType: z.string().min(1),
  methodId: z.string().min(1),
  methodName: z.string().min(1),
  description: z.string().max(500).nullable().optional()
});

const analysisChainSchema = z
  .object({
    resultName: z.string().min(1).max(120),
    steps: z.array(analysisTemplateSchema).min(1),
    operators: z.array(analysisOperatorSchema)
  })
  .refine((value) => value.operators.length === value.steps.length - 1, {
    message: 'Operators must connect each step.'
  });

const createSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('single'),
    name: z.string().min(1).max(120),
    template: analysisTemplateSchema
  }),
  z.object({
    type: z.literal('chain'),
    name: z.string().min(1).max(120),
    chain: analysisChainSchema
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
      id: analysisPresets.id,
      name: analysisPresets.name,
      template: analysisPresets.template,
      createdAt: analysisPresets.createdAt,
      authorId: users.id,
      authorName: users.name,
      authorImage: users.image
    })
    .from(analysisPresets)
    .innerJoin(users, eq(analysisPresets.createdByUserId, users.id));

  if (authorFilter && authorFilter !== 'all') {
    presetsQuery = presetsQuery.where(eq(analysisPresets.createdByUserId, authorFilter));
  }

  const presetRows = await presetsQuery.orderBy(desc(analysisPresets.createdAt));

  let chainsQuery = db
    .select({
      id: analysisPresetChains.id,
      name: analysisPresetChains.name,
      chain: analysisPresetChains.chain,
      createdAt: analysisPresetChains.createdAt,
      authorId: users.id,
      authorName: users.name,
      authorImage: users.image
    })
    .from(analysisPresetChains)
    .innerJoin(users, eq(analysisPresetChains.createdByUserId, users.id));

  if (authorFilter && authorFilter !== 'all') {
    chainsQuery = chainsQuery.where(eq(analysisPresetChains.createdByUserId, authorFilter));
  }

  const chainRows = await chainsQuery.orderBy(desc(analysisPresetChains.createdAt));

  const presets: SavedAnalysisPresetRecord[] = presetRows.map((row) => ({
    id: row.id,
    name: row.name,
    template: row.template as AnalysisTemplatePayload,
    createdAt: row.createdAt.toISOString(),
    createdBy: mapAuthor({ id: row.authorId, name: row.authorName, image: row.authorImage })
  }));

  const chains: SavedAnalysisChainRecord[] = chainRows.map((row) => ({
    id: row.id,
    name: row.name,
    chain: row.chain as AnalysisChainPayload,
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
      .insert(analysisPresets)
      .values({
        name: parsed.data.name,
        template: parsed.data.template satisfies AnalysisTemplatePayload,
        createdByUserId: session.user.id
      })
      .returning({
        id: analysisPresets.id,
        name: analysisPresets.name,
        template: analysisPresets.template,
        createdAt: analysisPresets.createdAt
      });

    const preset: SavedAnalysisPresetRecord = {
      id: record.id,
      name: record.name,
      template: record.template as AnalysisTemplatePayload,
      createdAt: record.createdAt.toISOString(),
      createdBy: author
    };

    return NextResponse.json({ preset }, { status: 201 });
  }

  const [record] = await db
    .insert(analysisPresetChains)
    .values({
      name: parsed.data.name,
      chain: parsed.data.chain satisfies AnalysisChainPayload,
      createdByUserId: session.user.id
    })
    .returning({
      id: analysisPresetChains.id,
      name: analysisPresetChains.name,
      chain: analysisPresetChains.chain,
      createdAt: analysisPresetChains.createdAt
    });

  const chain: SavedAnalysisChainRecord = {
    id: record.id,
    name: record.name,
    chain: record.chain as AnalysisChainPayload,
    createdAt: record.createdAt.toISOString(),
    createdBy: author
  };

  return NextResponse.json({ chain }, { status: 201 });
}
