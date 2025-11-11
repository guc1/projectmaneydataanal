CREATE TABLE IF NOT EXISTS "upload_selections" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "button_key" text NOT NULL,
    "upload_id" uuid NOT NULL REFERENCES "upload_entries"("id") ON DELETE CASCADE,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "selected_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "upload_selections_user_button_key" ON "upload_selections" ("user_id", "button_key");
CREATE INDEX IF NOT EXISTS "upload_selections_upload_id_idx" ON "upload_selections" ("upload_id");
