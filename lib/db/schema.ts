import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  interval,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core';

export const hoursSavedScopeEnum = pgEnum('hours_saved_scope', ['global', 'team', 'user']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name'),
    username: text('username').notNull(),
    email: text('email').unique(),
    image: text('image'),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    usersCreatedAtIdx: index('users_created_at_idx').on(table.createdAt),
    usersUsernameIdx: uniqueIndex('users_username_idx').on(table.username)
  })
);

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refreshToken: text('refresh_token'),
    accessToken: text('access_token'),
    expiresAt: integer('expires_at'),
    tokenType: text('token_type'),
    scope: text('scope'),
    idToken: text('id_token'),
    sessionState: text('session_state'),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    providerAccountIdx: uniqueIndex('accounts_provider_provider_account_id_key').on(
      table.provider,
      table.providerAccountId
    ),
    accountsUserIdx: index('accounts_user_id_idx').on(table.userId)
  })
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionToken: text('session_token').notNull().unique(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expires: timestamp('expires', { mode: 'date', withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    sessionsUserIdx: index('sessions_user_id_idx').on(table.userId)
  })
);

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date', withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    verificationTokenIdentifierTokenKey: uniqueIndex('verification_token_identifier_token_key').on(
      table.identifier,
      table.token
    )
  })
);

export const meetingSlots = pgTable(
  'meeting_slots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    startsAt: timestamp('starts_at', { mode: 'date', withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { mode: 'date', withTimezone: true }).notNull(),
    duration: interval('duration'),
    isBookable: boolean('is_bookable').default(true).notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    meetingSlotsStartsIdx: index('meeting_slots_starts_at_idx').on(table.startsAt)
  })
);

export const meetingBookings = pgTable(
  'meeting_bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slotId: uuid('slot_id')
      .notNull()
      .references(() => meetingSlots.id, { onDelete: 'cascade' }),
    bookedByUserId: uuid('booked_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    externalName: text('external_name'),
    externalEmail: text('external_email'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    meetingBookingsSlotIdx: uniqueIndex('meeting_bookings_slot_id_key').on(table.slotId),
    meetingBookingsUserIdx: index('meeting_bookings_user_id_idx').on(table.bookedByUserId)
  })
);

export const contactMessages = pgTable(
  'contact_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    message: text('message').notNull(),
    isResolved: boolean('is_resolved').default(false).notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    resolvedAt: timestamp('resolved_at', { mode: 'date', withTimezone: true })
  },
  (table) => ({
    contactMessagesCreatedIdx: index('contact_messages_created_at_idx').on(table.createdAt)
  })
);

export const visitorSessions = pgTable(
  'visitor_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: text('session_id').notNull(),
    firstSeenAt: timestamp('first_seen_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    lastSeenAt: timestamp('last_seen_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    pageViews: integer('page_views').default(1).notNull(),
    utmCampaign: text('utm_campaign'),
    referrer: text('referrer')
  },
  (table) => ({
    visitorSessionsSessionIdx: uniqueIndex('visitor_sessions_session_id_key').on(table.sessionId)
  })
);

export const hoursSavedState = pgTable(
  'hours_saved_state',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scope: hoursSavedScopeEnum('scope').default('global').notNull(),
    baselineHours: numeric('baseline_hours', { precision: 10, scale: 2 }).default('0').notNull(),
    accumulatedHours: numeric('accumulated_hours', { precision: 10, scale: 2 }).default('0').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    hoursSavedStateScopeIdx: uniqueIndex('hours_saved_state_scope_key').on(table.scope)
  })
);

export const hoursSavedIncrements = pgTable(
  'hours_saved_increments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scope: hoursSavedScopeEnum('scope').default('global').notNull(),
    delta: numeric('delta', { precision: 10, scale: 2 }).notNull(),
    reason: text('reason'),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    hoursSavedIncrementsScopeIdx: index('hours_saved_increments_scope_idx').on(table.scope)
  })
);

export const outreachPages = pgTable(
  'outreach_pages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    hero: text('hero'),
    content: text('content').notNull(),
    published: boolean('published').default(false).notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    outreachPagesSlugIdx: uniqueIndex('outreach_pages_slug_key').on(table.slug),
    outreachPagesPublishedIdx: index('outreach_pages_published_idx').on(table.published)
  })
);

export const dashboardInboxMessages = pgTable(
  'dashboard_inbox_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subject: text('subject').notNull(),
    body: text('body').notNull(),
    status: text('status').default('unread').notNull(),
    senderName: text('sender_name'),
    senderEmail: text('sender_email'),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    dashboardInboxStatusIdx: index('dashboard_inbox_status_idx').on(table.status)
  })
);

export const uploadEntries = pgTable(
  'upload_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    buttonKey: text('button_key').notNull(),
    fileName: text('file_name').notNull(),
    description: text('description'),
    filePath: text('file_path').notNull(),
    uploadedByUserId: uuid('uploaded_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    uploadedAt: timestamp('uploaded_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    uploadEntriesButtonIdx: index('upload_entries_button_idx').on(table.buttonKey),
    uploadEntriesUserIdx: index('upload_entries_user_idx').on(table.uploadedByUserId),
    uploadEntriesUploadedAtIdx: index('upload_entries_uploaded_at_idx').on(table.uploadedAt)
  })
);

export const uploadSelections = pgTable(
  'upload_selections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    buttonKey: text('button_key').notNull(),
    uploadId: uuid('upload_id')
      .notNull()
      .references(() => uploadEntries.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    selectedAt: timestamp('selected_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    uploadSelectionsUserButtonIdx: uniqueIndex('upload_selections_user_button_key').on(
      table.userId,
      table.buttonKey
    ),
    uploadSelectionsUploadIdx: index('upload_selections_upload_id_idx').on(table.uploadId)
  })
);

export const filterPresets = pgTable(
  'filter_presets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    template: jsonb('template').notNull(),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    filterPresetsUserIdx: index('filter_presets_user_idx').on(table.createdByUserId),
    filterPresetsCreatedIdx: index('filter_presets_created_idx').on(table.createdAt)
  })
);

export const filterPresetChains = pgTable(
  'filter_preset_chains',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    templates: jsonb('templates').notNull(),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    filterPresetChainsUserIdx: index('filter_preset_chains_user_idx').on(table.createdByUserId),
    filterPresetChainsCreatedIdx: index('filter_preset_chains_created_idx').on(table.createdAt)
  })
);

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  uploads: many(uploadEntries),
  uploadSelections: many(uploadSelections),
  bookings: many(meetingBookings),
  filterPresets: many(filterPresets),
  filterPresetChains: many(filterPresetChains)
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id]
  })
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id]
  })
}));

export const meetingSlotsRelations = relations(meetingSlots, ({ one, many }) => ({
  booking: one(meetingBookings, {
    fields: [meetingSlots.id],
    references: [meetingBookings.slotId]
  }),
  bookings: many(meetingBookings)
}));

export const meetingBookingsRelations = relations(meetingBookings, ({ one }) => ({
  slot: one(meetingSlots, {
    fields: [meetingBookings.slotId],
    references: [meetingSlots.id]
  }),
  user: one(users, {
    fields: [meetingBookings.bookedByUserId],
    references: [users.id]
  })
}));

export const uploadEntriesRelations = relations(uploadEntries, ({ one, many }) => ({
  uploadedBy: one(users, {
    fields: [uploadEntries.uploadedByUserId],
    references: [users.id]
  }),
  selections: many(uploadSelections)
}));

export const uploadSelectionsRelations = relations(uploadSelections, ({ one }) => ({
  upload: one(uploadEntries, {
    fields: [uploadSelections.uploadId],
    references: [uploadEntries.id]
  }),
  user: one(users, {
    fields: [uploadSelections.userId],
    references: [users.id]
  })
}));

export const filterPresetsRelations = relations(filterPresets, ({ one }) => ({
  author: one(users, {
    fields: [filterPresets.createdByUserId],
    references: [users.id]
  })
}));

export const filterPresetChainsRelations = relations(filterPresetChains, ({ one }) => ({
  author: one(users, {
    fields: [filterPresetChains.createdByUserId],
    references: [users.id]
  })
}));
