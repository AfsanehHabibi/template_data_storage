/*
# FieldNote — Template-based data collection schema (single-tenant, no auth)

1. Purpose
   This app lets a single user define data-collection "templates" (e.g. "Stress Reaction"),
   each with custom fields (text, single-select, multi-select, number, checkbox, date/time).
   The user then creates "items" — individual incidents — filling in the template fields.
   Items can have photos/files attached. Collected data is viewed in a statistics dashboard
   and exported as CSV.

2. Tables
   - `templates` — a named template (e.g. "Stress Reaction") with a description and icon.
   - `template_fields` — ordered list of fields belonging to a template. Each field has a
     type (text, textarea, single_select, multi_select, number, checkbox, datetime),
     options (JSON array for select types), and a default_value (JSON).
   - `items` — a single data entry/incident created from a template. Has a timestamp and
     optional notes. Stores the template_id snapshot at creation time.
   - `item_field_values` — the value of a single field for a single item. Stored as JSON
     so all field types are handled uniformly.
   - `item_attachments` — photos/files attached to an item. Stores file path in Supabase
     Storage, content type, and file name.

3. Security
   - Single-tenant, no auth. RLS enabled on all tables with `TO anon, authenticated` and
     `USING (true)` / `WITH CHECK (true)` — data is intentionally shared/public for the
     single user.

4. Important Notes
   - `template_fields.options` is a JSONB array of strings for select-type fields.
   - `template_fields.default_value` is JSONB — the shape depends on field type:
     text/textarea: string; single_select: string; multi_select: string[]; number: number;
     checkbox: boolean; datetime: ISO string.
   - `item_field_values.value` is JSONB with the same shape as default_value.
   - Deleting a template cascades to its fields. Deleting an item cascades to its field
     values and attachments.
   - `items.created_at` is indexed for time-based statistics queries.
*/

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  icon text DEFAULT 'ClipboardList',
  color text DEFAULT '#3b82f6',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_templates" ON templates;
CREATE POLICY "anon_select_templates" ON templates FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_templates" ON templates;
CREATE POLICY "anon_insert_templates" ON templates FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_templates" ON templates;
CREATE POLICY "anon_update_templates" ON templates FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_templates" ON templates;
CREATE POLICY "anon_delete_templates" ON templates FOR DELETE
  TO anon, authenticated USING (true);

-- Template fields table
CREATE TABLE IF NOT EXISTS template_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  label text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text','textarea','single_select','multi_select','number','checkbox','datetime')),
  options jsonb DEFAULT '[]'::jsonb,
  default_value jsonb,
  is_required boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE template_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_template_fields" ON template_fields;
CREATE POLICY "anon_select_template_fields" ON template_fields FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_template_fields" ON template_fields;
CREATE POLICY "anon_insert_template_fields" ON template_fields FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_template_fields" ON template_fields;
CREATE POLICY "anon_update_template_fields" ON template_fields FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_template_fields" ON template_fields;
CREATE POLICY "anon_delete_template_fields" ON template_fields FOR DELETE
  TO anon, authenticated USING (true);

-- Items table
CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  notes text DEFAULT '',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_items" ON items;
CREATE POLICY "anon_select_items" ON items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_items" ON items;
CREATE POLICY "anon_insert_items" ON items FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_items" ON items;
CREATE POLICY "anon_update_items" ON items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_items" ON items;
CREATE POLICY "anon_delete_items" ON items FOR DELETE
  TO anon, authenticated USING (true);

-- Item field values table
CREATE TABLE IF NOT EXISTS item_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  field_id uuid NOT NULL REFERENCES template_fields(id) ON DELETE CASCADE,
  value jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(item_id, field_id)
);

ALTER TABLE item_field_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_item_field_values" ON item_field_values;
CREATE POLICY "anon_select_item_field_values" ON item_field_values FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_item_field_values" ON item_field_values;
CREATE POLICY "anon_insert_item_field_values" ON item_field_values FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_item_field_values" ON item_field_values;
CREATE POLICY "anon_update_item_field_values" ON item_field_values FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_item_field_values" ON item_field_values;
CREATE POLICY "anon_delete_item_field_values" ON item_field_values FOR DELETE
  TO anon, authenticated USING (true);

-- Item attachments table
CREATE TABLE IF NOT EXISTS item_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  content_type text NOT NULL DEFAULT 'application/octet-stream',
  file_size bigint DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE item_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_item_attachments" ON item_attachments;
CREATE POLICY "anon_select_item_attachments" ON item_attachments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_item_attachments" ON item_attachments;
CREATE POLICY "anon_insert_item_attachments" ON item_attachments FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_item_attachments" ON item_attachments;
CREATE POLICY "anon_update_item_attachments" ON item_attachments FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_item_attachments" ON item_attachments;
CREATE POLICY "anon_delete_item_attachments" ON item_attachments FOR DELETE
  TO anon, authenticated USING (true);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_items_template_id ON items(template_id);
CREATE INDEX IF NOT EXISTS idx_items_occurred_at ON items(occurred_at);
CREATE INDEX IF NOT EXISTS idx_item_field_values_item_id ON item_field_values(item_id);
CREATE INDEX IF NOT EXISTS idx_item_attachments_item_id ON item_attachments(item_id);

-- Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for single-tenant access
DROP POLICY IF EXISTS "anon_select_attachments" ON storage.objects;
CREATE POLICY "anon_select_attachments" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'attachments');

DROP POLICY IF EXISTS "anon_insert_attachments" ON storage.objects;
CREATE POLICY "anon_insert_attachments" ON storage.objects
  FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'attachments');

DROP POLICY IF EXISTS "anon_update_attachments" ON storage.objects;
CREATE POLICY "anon_update_attachments" ON storage.objects
  FOR UPDATE TO anon, authenticated USING (bucket_id = 'attachments') WITH CHECK (bucket_id = 'attachments');

DROP POLICY IF EXISTS "anon_delete_attachments" ON storage.objects;
CREATE POLICY "anon_delete_attachments" ON storage.objects
  FOR DELETE TO anon, authenticated USING (bucket_id = 'attachments');
