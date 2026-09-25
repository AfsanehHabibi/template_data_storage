import { supabase } from './supabase';
import type { Template, TemplateField, FieldType } from './types';
import { sortFields } from './helpers';

export async function createTemplate(
  data: Pick<Template, 'name' | 'description' | 'icon' | 'color'>
): Promise<Template | null> {
  const { data: tmpl, error } = await supabase
    .from('templates')
    .insert(data)
    .select()
    .single();
  if (error) {
    console.error('Failed to create template:', error.message);
    return null;
  }
  return tmpl;
}

export async function updateTemplate(
  id: string,
  data: Partial<Pick<Template, 'name' | 'description' | 'icon' | 'color' | 'is_active'>>
): Promise<boolean> {
  const { error } = await supabase.from('templates').update(data).eq('id', id);
  if (error) {
    console.error('Failed to update template:', error.message);
    return false;
  }
  return true;
}

export async function deleteTemplate(id: string): Promise<boolean> {
  const { error } = await supabase.from('templates').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete template:', error.message);
    return false;
  }
  return true;
}

export async function saveTemplateFields(
  templateId: string,
  fields: Array<
    Pick<TemplateField, 'label' | 'field_type' | 'options' | 'default_value' | 'is_required' | 'sort_order'> & {
      id?: string;
    }
  >
): Promise<boolean> {
  // Get existing fields
  const { data: existing } = await supabase
    .from('template_fields')
    .select('id')
    .eq('template_id', templateId);

  const existingIds = new Set((existing ?? []).map((f) => f.id));
  const keepIds = new Set(fields.filter((f) => f.id).map((f) => f.id!));
  const toDelete = [...existingIds].filter((id) => !keepIds.has(id));

  // Delete removed fields
  if (toDelete.length > 0) {
    await supabase.from('template_fields').delete().in('id', toDelete);
  }

  // Upsert fields
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    const payload = {
      template_id: templateId,
      label: f.label,
      field_type: f.field_type,
      options: f.options ?? [],
      default_value: f.default_value ?? null,
      is_required: f.is_required,
      sort_order: f.sort_order,
    };

    if (f.id) {
      await supabase
        .from('template_fields')
        .update(payload)
        .eq('id', f.id);
    } else {
      await supabase.from('template_fields').insert(payload);
    }
  }

  return true;
}

export async function fetchTemplateFields(templateId: string): Promise<TemplateField[]> {
  const { data } = await supabase
    .from('template_fields')
    .select('*')
    .eq('template_id', templateId)
    .order('sort_order', { ascending: true });
  return sortFields(data ?? []);
}

export async function createItem(
  templateId: string,
  values: Record<string, unknown>,
  fields: TemplateField[],
  occurredAt?: string,
  notes?: string
): Promise<string | null> {
  const { data: item, error } = await supabase
    .from('items')
    .insert({
      template_id: templateId,
      occurred_at: occurredAt ?? new Date().toISOString(),
      notes: notes ?? '',
    })
    .select()
    .single();

  if (error || !item) {
    console.error('Failed to create item:', error?.message);
    return null;
  }

  const fieldValueRows = fields.map((f) => ({
    item_id: item.id,
    field_id: f.id,
    value: values[f.id] ?? null,
  }));

  if (fieldValueRows.length > 0) {
    const { error: fvError } = await supabase
      .from('item_field_values')
      .insert(fieldValueRows);
    if (fvError) {
      console.error('Failed to save field values:', fvError.message);
    }
  }

  return item.id;
}

export async function updateItem(
  itemId: string,
  values: Record<string, unknown>,
  fields: TemplateField[],
  occurredAt: string,
  notes: string
): Promise<boolean> {
  const { error } = await supabase
    .from('items')
    .update({ occurred_at: occurredAt, notes, updated_at: new Date().toISOString() })
    .eq('id', itemId);
  if (error) {
    console.error('Failed to update item:', error.message);
    return false;
  }

  for (const f of fields) {
    const value = values[f.id] ?? null;
    const { error: upsertError } = await supabase
      .from('item_field_values')
      .upsert(
        { item_id: itemId, field_id: f.id, value },
        { onConflict: 'item_id,field_id' }
      );
    if (upsertError) {
      console.error('Failed to upsert field value:', upsertError.message);
    }
  }

  return true;
}

export async function deleteItem(itemId: string): Promise<boolean> {
  // Delete attachments from storage first
  const { data: attachments } = await supabase
    .from('item_attachments')
    .select('storage_path')
    .eq('item_id', itemId);

  if (attachments && attachments.length > 0) {
    const paths = attachments.map((a) => a.storage_path);
    await supabase.storage.from('attachments').remove(paths);
  }

  const { error } = await supabase.from('items').delete().eq('id', itemId);
  if (error) {
    console.error('Failed to delete item:', error.message);
    return false;
  }
  return true;
}

export async function uploadAttachment(
  itemId: string,
  file: File
): Promise<string | null> {
  const ext = file.name.split('.').pop() ?? 'bin';
  const path = `${itemId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('attachments')
    .upload(path, file);

  if (uploadError) {
    console.error('Upload failed:', uploadError.message);
    return null;
  }

  const { data, error: dbError } = await supabase
    .from('item_attachments')
    .insert({
      item_id: itemId,
      storage_path: path,
      file_name: file.name,
      content_type: file.type || 'application/octet-stream',
      file_size: file.size,
    })
    .select()
    .single();

  if (dbError) {
    console.error('Failed to record attachment:', dbError.message);
    return null;
  }

  return data.id;
}

export async function deleteAttachment(attachmentId: string, storagePath: string): Promise<boolean> {
  await supabase.storage.from('attachments').remove([storagePath]);
  const { error } = await supabase
    .from('item_attachments')
    .delete()
    .eq('id', attachmentId);
  if (error) {
    console.error('Failed to delete attachment:', error.message);
    return false;
  }
  return true;
}

export function getAttachmentUrl(storagePath: string): string {
  const { data } = supabase.storage.from('attachments').getPublicUrl(storagePath);
  return data.publicUrl;
}

export function isValidFieldType(t: string): t is FieldType {
  return [
    'text',
    'textarea',
    'single_select',
    'multi_select',
    'number',
    'checkbox',
    'datetime',
  ].includes(t);
}
