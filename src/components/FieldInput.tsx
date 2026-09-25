import type { FieldType, TemplateField } from '@/lib/types';
import { getDefaultForField, formatDateTimeLocal, toISOFromLocal } from '@/lib/helpers';
import { Icon } from './Icon';

interface FieldInputProps {
  field: TemplateField;
  value: unknown;
  onChange: (value: unknown) => void;
  compact?: boolean;
}

export function FieldInput({ field, value, onChange, compact }: FieldInputProps) {
  const fieldType = field.field_type;

  const renderInput = () => {
    switch (fieldType) {
      case 'text':
        return (
          <input
            type="text"
            className="field-input"
            placeholder="Enter text…"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );

      case 'textarea':
        return (
          <textarea
            className="field-input min-h-[80px] resize-y"
            placeholder="Enter description…"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            className="field-input"
            placeholder="0"
            value={(value as number | null) ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              onChange(v === '' ? null : Number(v));
            }}
          />
        );

      case 'single_select': {
        const options = (field.options ?? []) as string[];
        return (
          <div className="flex flex-wrap gap-1.5">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => onChange(value === opt ? '' : opt)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  value === opt
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {opt}
              </button>
            ))}
            {options.length === 0 && (
              <p className="text-sm text-slate-400 italic">No options defined yet</p>
            )}
          </div>
        );
      }

      case 'multi_select': {
        const options = (field.options ?? []) as string[];
        const selected = (Array.isArray(value) ? value : []) as string[];
        return (
          <div className="flex flex-wrap gap-1.5">
            {options.map((opt) => {
              const isSelected = selected.includes(opt);
              return (
                <button
                  key={opt}
                  onClick={() => {
                    if (isSelected) {
                      onChange(selected.filter((s) => s !== opt));
                    } else {
                      onChange([...selected, opt]);
                    }
                  }}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {isSelected && <Icon name="Check" size={14} />}
                  {opt}
                </button>
              );
            })}
            {options.length === 0 && (
              <p className="text-sm text-slate-400 italic">No options defined yet</p>
            )}
          </div>
        );
      }

      case 'checkbox':
        return (
          <button
            onClick={() => onChange(!value)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              value ? 'bg-slate-900' : 'bg-slate-200'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                value ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        );

      case 'datetime':
        return (
          <input
            type="datetime-local"
            className="field-input"
            value={value ? formatDateTimeLocal(value as string) : ''}
            onChange={(e) => {
              if (e.target.value) {
                onChange(toISOFromLocal(e.target.value));
              } else {
                onChange(null);
              }
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={compact ? 'space-y-1' : 'space-y-2'}>
      {!compact && (
        <div className="flex items-center justify-between">
          <label className="label mb-0">
            {field.label}
            {field.is_required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        </div>
      )}
      {renderInput()}
    </div>
  );
}

export function FieldDefaultValueEditor({
  field,
  onChange,
}: {
  field: { field_type: FieldType; options: string[]; default_value: unknown };
  onChange: (value: unknown) => void;
}) {
  const value = field.default_value ?? getDefaultForField(field);

  const editor = () => {
    switch (field.field_type) {
      case 'text':
        return (
          <input
            type="text"
            className="field-input"
            placeholder="No default"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value || null)}
          />
        );
      case 'textarea':
        return (
          <textarea
            className="field-input min-h-[60px] resize-y"
            placeholder="No default"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value || null)}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            className="field-input"
            placeholder="No default"
            value={(value as number | null) ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              onChange(v === '' ? null : Number(v));
            }}
          />
        );
      case 'single_select': {
        const options = field.options ?? [];
        return (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => onChange(null)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                !value || value === ''
                  ? 'bg-slate-200 text-slate-700'
                  : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
              }`}
            >
              None
            </button>
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => onChange(value === opt ? null : opt)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  value === opt
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        );
      }
      case 'multi_select': {
        const options = field.options ?? [];
        const selected = (Array.isArray(value) ? value : []) as string[];
        return (
          <div className="flex flex-wrap gap-1.5">
            {options.map((opt) => {
              const isSelected = selected.includes(opt);
              return (
                <button
                  key={opt}
                  onClick={() => {
                    if (isSelected) {
                      onChange(selected.filter((s) => s !== opt));
                    } else {
                      onChange([...selected, opt]);
                    }
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {isSelected && <Icon name="Check" size={12} />}
                  {opt}
                </button>
              );
            })}
          </div>
        );
      }
      case 'checkbox':
        return (
          <button
            onClick={() => onChange(!value)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              value ? 'bg-slate-900' : 'bg-slate-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                value ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        );
      case 'datetime':
        return (
          <input
            type="datetime-local"
            className="field-input"
            value={value ? formatDateTimeLocal(value as string) : ''}
            onChange={(e) => {
              if (e.target.value) {
                onChange(toISOFromLocal(e.target.value));
              } else {
                onChange(null);
              }
            }}
          />
        );
      default:
        return null;
    }
  };

  return editor();
}
