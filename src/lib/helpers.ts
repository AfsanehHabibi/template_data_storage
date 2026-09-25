import type { FieldType, TemplateField } from './types';

export function getFieldValue(
  fieldValues: { field_id: string; value: unknown }[],
  fieldId: string
): unknown {
  const fv = fieldValues.find((v) => v.field_id === fieldId);
  return fv?.value ?? null;
}

export function getDefaultForField(field: {
  field_type: FieldType;
  default_value: unknown;
}): unknown {
  if (field.default_value !== null && field.default_value !== undefined) {
    return field.default_value;
  }
  switch (field.field_type) {
    case 'text':
    case 'textarea':
      return '';
    case 'single_select':
      return '';
    case 'multi_select':
      return [];
    case 'number':
      return null;
    case 'checkbox':
      return false;
    case 'datetime':
      return new Date().toISOString();
  }
}

export function formatFieldValue(value: unknown, fieldType: FieldType): string {
  if (value === null || value === undefined || value === '') return '—';
  switch (fieldType) {
    case 'text':
    case 'textarea':
      return String(value);
    case 'single_select':
      return String(value);
    case 'multi_select':
      return Array.isArray(value) ? value.join(', ') : String(value);
    case 'number':
      return String(value);
    case 'checkbox':
      return value ? 'Yes' : 'No';
    case 'datetime':
      return new Date(value as string).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    default:
      return String(value);
  }
}

export function formatRelativeTime(date: string): string {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function toISOFromLocal(local: string): string {
  return new Date(local).toISOString();
}

export function isFieldEmpty(value: unknown, fieldType: FieldType): boolean {
  if (value === null || value === undefined) return true;
  if (fieldType === 'multi_select') return Array.isArray(value) && value.length === 0;
  if (typeof value === 'string') return value.trim() === '';
  if (fieldType === 'checkbox') return false;
  if (fieldType === 'number') return value === null || value === '';
  return false;
}

export function fieldsWithOptions(fieldType: FieldType): boolean {
  return fieldType === 'single_select' || fieldType === 'multi_select';
}

export function sortFields(fields: TemplateField[]): TemplateField[] {
  return [...fields].sort((a, b) => a.sort_order - b.sort_order);
}

export function exportToCSV(
  headers: string[],
  rows: (string | number)[][],
  filename: string
): void {
  const escape = (val: string | number): string => {
    const s = String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const csv = [headers, ...rows]
    .map((row) => row.map(escape).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
