import { eq } from 'drizzle-orm';

import { db } from '@/lib/db/client';
import { hoursSavedIncrements, hoursSavedState } from '@/lib/db/schema';

type HoursSavedScope = 'global' | 'team' | 'user';

export async function getHoursSaved(scope: HoursSavedScope = 'global') {
  const [state] = await db
    .select()
    .from(hoursSavedState)
    .where(eq(hoursSavedState.scope, scope))
    .limit(1);

  if (!state) {
    return { scope, baselineHours: 0, accumulatedHours: 0 };
  }

  return {
    scope,
    baselineHours: Number(state.baselineHours ?? 0),
    accumulatedHours: Number(state.accumulatedHours ?? 0)
  };
}

export async function incrementHoursSaved({
  scope,
  delta,
  reason
}: {
  scope: HoursSavedScope;
  delta: number;
  reason?: string;
}) {
  const [state] = await db
    .insert(hoursSavedIncrements)
    .values({ scope, delta: delta.toString(), reason: reason ?? null })
    .returning();

  const current = await getHoursSaved(scope);
  const accumulated = current.accumulatedHours + delta;

  await db
    .insert(hoursSavedState)
    .values({
      scope,
      baselineHours: current.baselineHours.toString(),
      accumulatedHours: accumulated.toString()
    })
    .onConflictDoUpdate({
      target: hoursSavedState.scope,
      set: { accumulatedHours: accumulated.toString(), updatedAt: new Date() }
    });

  return state;
}
