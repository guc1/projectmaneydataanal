CREATE TABLE IF NOT EXISTS "filter_presets" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" text NOT NULL,
    "template" jsonb NOT NULL,
    "created_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "filter_presets_user_idx" ON "filter_presets" ("created_by_user_id");
CREATE INDEX IF NOT EXISTS "filter_presets_created_idx" ON "filter_presets" ("created_at");

CREATE TABLE IF NOT EXISTS "filter_preset_chains" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" text NOT NULL,
    "templates" jsonb NOT NULL,
    "created_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "filter_preset_chains_user_idx" ON "filter_preset_chains" ("created_by_user_id");
CREATE INDEX IF NOT EXISTS "filter_preset_chains_created_idx" ON "filter_preset_chains" ("created_at");
