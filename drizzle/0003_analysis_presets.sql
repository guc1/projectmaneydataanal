CREATE TABLE IF NOT EXISTS "analysis_presets" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" text NOT NULL,
    "template" jsonb NOT NULL,
    "created_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "analysis_presets_user_idx" ON "analysis_presets" ("created_by_user_id");
CREATE INDEX IF NOT EXISTS "analysis_presets_created_idx" ON "analysis_presets" ("created_at");

CREATE TABLE IF NOT EXISTS "analysis_preset_chains" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" text NOT NULL,
    "chain" jsonb NOT NULL,
    "created_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "analysis_preset_chains_user_idx" ON "analysis_preset_chains" ("created_by_user_id");
CREATE INDEX IF NOT EXISTS "analysis_preset_chains_created_idx" ON "analysis_preset_chains" ("created_at");
