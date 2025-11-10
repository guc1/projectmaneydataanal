import { and, asc, desc, eq, gt } from 'drizzle-orm';

import { db } from '@/lib/db/client';
import { meetingBookings, meetingSlots, users } from '@/lib/db/schema';

export async function getUpcomingSlots(referenceDate: Date = new Date()) {
  return db
    .select({
      id: meetingSlots.id,
      startsAt: meetingSlots.startsAt,
      endsAt: meetingSlots.endsAt,
      isBookable: meetingSlots.isBookable
    })
    .from(meetingSlots)
    .where(and(eq(meetingSlots.isBookable, true), gt(meetingSlots.startsAt, referenceDate)))
    .orderBy(asc(meetingSlots.startsAt));
}

export async function getBookings() {
  return db
    .select({
      id: meetingBookings.id,
      startsAt: meetingSlots.startsAt,
      endsAt: meetingSlots.endsAt,
      bookedBy: users.name,
      bookedById: users.id,
      notes: meetingBookings.notes
    })
    .from(meetingBookings)
    .innerJoin(meetingSlots, eq(meetingBookings.slotId, meetingSlots.id))
    .leftJoin(users, eq(meetingBookings.bookedByUserId, users.id))
    .orderBy(desc(meetingSlots.startsAt));
}

export async function createSlot(startsAt: Date, endsAt: Date) {
  const [slot] = await db
    .insert(meetingSlots)
    .values({ startsAt, endsAt, isBookable: true })
    .returning();

  return slot;
}

export async function bookSlot({
  slotId,
  userId,
  notes,
  externalEmail,
  externalName
}: {
  slotId: string;
  userId?: string;
  notes?: string;
  externalEmail?: string;
  externalName?: string;
}) {
  const [booking] = await db
    .insert(meetingBookings)
    .values({
      slotId,
      bookedByUserId: userId,
      notes,
      externalEmail,
      externalName
    })
    .returning();

  await db
    .update(meetingSlots)
    .set({ isBookable: false })
    .where(eq(meetingSlots.id, slotId));

  return booking;
}

export async function cancelBooking(slotId: string) {
  await db.delete(meetingBookings).where(eq(meetingBookings.slotId, slotId));
  await db.update(meetingSlots).set({ isBookable: true }).where(eq(meetingSlots.id, slotId));
}
