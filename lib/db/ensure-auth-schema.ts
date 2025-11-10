import { randomUUID } from 'node:crypto';

import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';

import type { Database } from './client';

let ensurePromise: Promise<void> | null = null;

async function runEnsure(db: Database) {
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "users" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" text,
      "username" text NOT NULL,
      "email" text UNIQUE,
      "image" text,
      "password_hash" text NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    ALTER TABLE "users"
    ADD COLUMN IF NOT EXISTS "username" text
  `);

  await db.execute(sql`
    ALTER TABLE "users"
    ADD COLUMN IF NOT EXISTS "password_hash" text
  `);

  await db.execute(sql`
    ALTER TABLE "users"
    ADD COLUMN IF NOT EXISTS "created_at" timestamptz NOT NULL DEFAULT now()
  `);

  await db.execute(sql`
    ALTER TABLE "users"
    ADD COLUMN IF NOT EXISTS "updated_at" timestamptz NOT NULL DEFAULT now()
  `);

  await db.execute(sql`
    ALTER TABLE "users"
    ADD COLUMN IF NOT EXISTS "image" text
  `);

  await db.execute(sql`
    ALTER TABLE "users"
    ADD COLUMN IF NOT EXISTS "name" text
  `);

  await db.execute(sql`
    ALTER TABLE "users"
    ADD COLUMN IF NOT EXISTS "email" text
  `);

  await db.execute(sql`
    ALTER TABLE "users"
    ALTER COLUMN "username" DROP DEFAULT
  `);

  await db.execute(sql`
    UPDATE "users"
    SET "username" = lower(nullif(regexp_replace(coalesce("username", ''), '[^a-z0-9_]', '', 'gi'), ''))
    WHERE "username" IS NOT NULL
  `);

  await db.execute(sql`
    UPDATE "users"
    SET "username" = lower(
      nullif(
        regexp_replace(coalesce("email", ''), '[^a-z0-9_]', '', 'gi'),
        ''
      )
    )
    WHERE "username" IS NULL
  `);

  await db.execute(sql`
    UPDATE "users"
    SET "username" = concat('user_', substr(replace(id::text, '-', ''), 1, 12))
    WHERE "username" IS NULL
  `);

  await db.execute(sql`
    ALTER TABLE "users"
    ALTER COLUMN "username" SET NOT NULL
  `);

  const fallbackPasswordHash = await bcrypt.hash(randomUUID(), 12);

  await db.execute(sql`
    UPDATE "users"
    SET "password_hash" = ${fallbackPasswordHash}
    WHERE "password_hash" IS NULL OR length(trim("password_hash")) = 0
  `);

  await db.execute(sql`
    ALTER TABLE "users"
    ALTER COLUMN "password_hash" SET NOT NULL
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "users_username_idx"
    ON "users" ("username")
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "users_created_at_idx"
    ON "users" ("created_at")
  `);
}

export async function ensureAuthSchema(db: Database) {
  if (!ensurePromise) {
    ensurePromise = runEnsure(db).catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  return ensurePromise;
}
