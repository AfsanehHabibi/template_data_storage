export type FieldType =
  | 'text'
  | 'textarea'
  | 'single_select'
  | 'multi_select'
  | 'number'
  | 'checkbox'
  | 'datetime';

export interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateField {
  id: string;
  template_id: string;
  label: string;
  field_type: FieldType;
  options: string[];
  default_value: unknown;
  is_required: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  template_id: string;
  notes: string;
  occurred_at: string;
  created_at: string;
  updated_at: string;
}

export interface ItemFieldValue {
  id: string;
  item_id: string;
  field_id: string;
  value: unknown;
  created_at: string;
}

export interface ItemAttachment {
  id: string;
  item_id: string;
  storage_path: string;
  file_name: string;
  content_type: string;
  file_size: number;
  created_at: string;
}

export interface TemplateWithFields extends Template {
  fields: TemplateField[];
}

export interface ItemWithDetails extends Item {
  field_values: ItemFieldValue[];
  attachments: ItemAttachment[];
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Short Text',
  textarea: 'Long Text',
  single_select: 'Single Select',
  multi_select: 'Multi Select',
  number: 'Number',
  checkbox: 'Checkbox',
  datetime: 'Date & Time',
};

export const FIELD_TYPE_ICONS: Record<FieldType, string> = {
  text: 'Type',
  textarea: 'AlignLeft',
  single_select: 'CircleDot',
  multi_select: 'ListChecks',
  number: 'Hash',
  checkbox: 'CheckSquare',
  datetime: 'Calendar',
};

export const TEMPLATE_ICONS = [
  'ClipboardList',
  'Heart',
  'Brain',
  'Activity',
  'Moon',
  'Sun',
  'CloudRain',
  'Smile',
  'Zap',
  'Coffee',
  'Dumbbell',
  'Utensils',
];

export const TEMPLATE_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#6366f1',
  '#84cc16',
];
