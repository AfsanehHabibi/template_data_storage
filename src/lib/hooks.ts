import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import type {
  Template,
  TemplateField,
  TemplateWithFields,
  Item,
  ItemFieldValue,
  ItemAttachment,
} from './types';
import { sortFields } from './helpers';

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) setError(error.message);
    else setTemplates(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { templates, loading, error, reload: load };
}

export function useTemplateWithFields(templateId: string | null) {
  const [template, setTemplate] = useState<TemplateWithFields | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!templateId) {
      setTemplate(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: tmpl, error: tmplErr }, { data: fields, error: fieldsErr }] =
      await Promise.all([
        supabase.from('templates').select('*').eq('id', templateId).maybeSingle(),
        supabase
          .from('template_fields')
          .select('*')
          .eq('template_id', templateId)
          .order('sort_order', { ascending: true }),
      ]);

    if (tmplErr || fieldsErr) {
      setError(tmplErr?.message ?? fieldsErr?.message ?? 'Unknown error');
      setTemplate(null);
    } else if (tmpl) {
      setTemplate({ ...tmpl, fields: sortFields(fields ?? []) });
    } else {
      setTemplate(null);
    }
    setLoading(false);
  }, [templateId]);

  useEffect(() => {
    load();
  }, [load]);

  return { template, loading, error, reload: load };
}

export function useItems(templateId: string | null) {
  const [items, setItems] = useState<
    (Item & { field_values: ItemFieldValue[]; attachments: ItemAttachment[] })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!templateId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('items')
      .select(
        '*, field_values:item_field_values(*), attachments:item_attachments(*)'
      )
      .eq('template_id', templateId)
      .order('occurred_at', { ascending: false });

    if (error) setError(error.message);
    else {
      // Normalize the response shape — supabase returns snake_case keys
      setItems(
        (data ?? []).map((item: Record<string, unknown>) => ({
          ...(item as unknown as Item),
          field_values: (item.field_values ?? []) as ItemFieldValue[],
          attachments: (item.attachments ?? []) as ItemAttachment[],
        }))
      );
    }
    setLoading(false);
  }, [templateId]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, error, reload: load };
}

export function useItemCounts() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('items')
      .select('template_id');

    if (!error && data) {
      const map: Record<string, number> = {};
      for (const row of data) {
        const tid = row.template_id as string;
        map[tid] = (map[tid] ?? 0) + 1;
      }
      setCounts(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { counts, loading, reload: load };
}
