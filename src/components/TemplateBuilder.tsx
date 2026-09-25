import { useState, useEffect } from 'react';
import type { Template, TemplateField, FieldType } from '@/lib/types';
import {
  FIELD_TYPE_LABELS,
  FIELD_TYPE_ICONS,
  TEMPLATE_ICONS,
  TEMPLATE_COLORS,
} from '@/lib/types';
import {
  createTemplate,
  updateTemplate,
  saveTemplateFields,
  deleteTemplate,
  fetchTemplateFields,
} from '@/lib/api';
import { Modal, ConfirmDialog } from './Modal';
import { Icon } from './Icon';
import { FieldDefaultValueEditor } from './FieldInput';
import { fieldsWithOptions } from '@/lib/helpers';

interface TemplateBuilderProps {
  open: boolean;
  onClose: () => void;
  editingTemplate: Template | null;
  onSaved: () => void;
}

interface DraftField {
  id?: string;
  label: string;
  field_type: FieldType;
  options: string[];
  default_value: unknown;
  is_required: boolean;
  sort_order: number;
}

const NEW_FIELD: DraftField = {
  label: '',
  field_type: 'text',
  options: [],
  default_value: null,
  is_required: false,
  sort_order: 0,
};

export function TemplateBuilder({ open, onClose, editingTemplate, onSaved }: TemplateBuilderProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('ClipboardList');
  const [color, setColor] = useState(TEMPLATE_COLORS[0]);
  const [fields, setFields] = useState<DraftField[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [expandedFieldIdx, setExpandedFieldIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editingTemplate) {
      setName(editingTemplate.name);
      setDescription(editingTemplate.description);
      setIcon(editingTemplate.icon);
      setColor(editingTemplate.color);
      setExpandedFieldIdx(null);
      fetchTemplateFields(editingTemplate.id).then((existing) => {
        setFields(
          existing.map((f) => ({
            id: f.id,
            label: f.label,
            field_type: f.field_type,
            options: f.options ?? [],
            default_value: f.default_value,
            is_required: f.is_required,
            sort_order: f.sort_order,
          }))
        );
      });
    } else {
      setName('');
      setDescription('');
      setIcon('ClipboardList');
      setColor(TEMPLATE_COLORS[0]);
      setFields([{ ...NEW_FIELD, sort_order: 0 }]);
      setExpandedFieldIdx(0);
    }
  }, [open, editingTemplate]);

  const addField = () => {
    const newField: DraftField = {
      ...NEW_FIELD,
      sort_order: fields.length,
    };
    setFields([...fields, newField]);
    setExpandedFieldIdx(fields.length);
  };

  const updateField = (idx: number, updates: Partial<DraftField>) => {
    setFields(fields.map((f, i) => (i === idx ? { ...f, ...updates } : f)));
  };

  const removeField = (idx: number) => {
    setFields(fields.filter((_, i) => i !== idx));
    setExpandedFieldIdx(null);
  };

  const moveField = (idx: number, direction: -1 | 1) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= fields.length) return;
    const newFields = [...fields];
    [newFields[idx], newFields[newIdx]] = [newFields[newIdx], newFields[idx]];
    newFields.forEach((f, i) => (f.sort_order = i));
    setFields(newFields);
    setExpandedFieldIdx(newIdx);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);

    const validFields = fields.filter((f) => f.label.trim());

    if (editingTemplate) {
      await updateTemplate(editingTemplate.id, { name, description, icon, color });
      await saveTemplateFields(
        editingTemplate.id,
        validFields.map((f, i) => ({ ...f, sort_order: i }))
      );
    } else {
      const tmpl = await createTemplate({ name, description, icon, color });
      if (tmpl) {
        await saveTemplateFields(
          tmpl.id,
          validFields.map((f, i) => ({ ...f, sort_order: i }))
        );
      }
    }

    setLoading(false);
    onSaved();
    onClose();
  };

  const handleDelete = async () => {
    if (!editingTemplate) return;
    await deleteTemplate(editingTemplate.id);
    onSaved();
    onClose();
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={editingTemplate ? 'Edit Template' : 'New Template'}
        subtitle="Define the fields you want to collect for each entry"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-5">
          {/* Template header */}
          <div className="space-y-4">
            <div>
              <label className="label">Template Name</label>
              <input
                className="input"
                placeholder="e.g. Stress Reaction"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="label">Description (optional)</label>
              <input
                className="input"
                placeholder="What is this template for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Icon</label>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_ICONS.map((ic) => (
                    <button
                      key={ic}
                      onClick={() => setIcon(ic)}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                        icon === ic
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      <Icon name={ic} size={18} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Color</label>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-9 h-9 rounded-lg transition-all ${
                        color === c ? 'ring-2 ring-offset-2 ring-slate-900' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Fields */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">
                Fields ({fields.length})
              </h3>
              <button className="btn-ghost text-xs px-2.5 py-1.5" onClick={addField}>
                <Icon name="Plus" size={14} />
                Add Field
              </button>
            </div>

            {fields.map((field, idx) => {
              const isExpanded = expandedFieldIdx === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 overflow-hidden transition-all"
                >
                  {/* Field header row */}
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50">
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveField(idx, -1)}
                        disabled={idx === 0}
                        className="text-slate-300 hover:text-slate-600 disabled:opacity-30"
                      >
                        <Icon name="ChevronUp" size={14} />
                      </button>
                      <button
                        onClick={() => moveField(idx, 1)}
                        disabled={idx === fields.length - 1}
                        className="text-slate-300 hover:text-slate-600 disabled:opacity-30"
                      >
                        <Icon name="ChevronDown" size={14} />
                      </button>
                    </div>

                    <button
                      onClick={() => setExpandedFieldIdx(isExpanded ? null : idx)}
                      className="flex-1 flex items-center gap-2 text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500">
                        <Icon name={FIELD_TYPE_ICONS[field.field_type]} size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {field.label || 'Untitled field'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {FIELD_TYPE_LABELS[field.field_type]}
                          {field.is_required && ' • Required'}
                        </p>
                      </div>
                      <Icon
                        name={isExpanded ? 'ChevronUp' : 'ChevronDown'}
                        size={16}
                        className="text-slate-400"
                      />
                    </button>

                    <button
                      onClick={() => removeField(idx)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Icon name="Trash2" size={15} />
                    </button>
                  </div>

                  {/* Expanded field editor */}
                  {isExpanded && (
                    <div className="px-3 py-3.5 space-y-3.5 bg-white animate-slide-up">
                      <div>
                        <label className="label">Field Label</label>
                        <input
                          className="input"
                          placeholder="e.g. Intensity Level"
                          value={field.label}
                          onChange={(e) => updateField(idx, { label: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="label">Field Type</label>
                        <div className="flex flex-wrap gap-1.5">
                          {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((ft) => (
                            <button
                              key={ft}
                              onClick={() => {
                                const updates: Partial<DraftField> = { field_type: ft };
                                if (!fieldsWithOptions(ft) && !fieldsWithOptions(field.field_type)) {
                                  // keep default_value
                                } else if (fieldsWithOptions(ft) && !fieldsWithOptions(field.field_type)) {
                                  updates.default_value = ft === 'multi_select' ? [] : '';
                                } else if (!fieldsWithOptions(ft) && fieldsWithOptions(field.field_type)) {
                                  updates.default_value = null;
                                }
                                updateField(idx, updates);
                              }}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                field.field_type === ft
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              <Icon name={FIELD_TYPE_ICONS[ft]} size={13} />
                              {FIELD_TYPE_LABELS[ft]}
                            </button>
                          ))}
                        </div>
                      </div>

                      {fieldsWithOptions(field.field_type) && (
                        <div>
                          <label className="label">Options</label>
                          <OptionsEditor
                            options={field.options}
                            onChange={(options) => updateField(idx, { options })}
                          />
                        </div>
                      )}

                      <div>
                        <label className="label">Default Value</label>
                        <FieldDefaultValueEditor
                          field={field}
                          onChange={(default_value) => updateField(idx, { default_value })}
                        />
                      </div>

                      <div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.is_required}
                            onChange={(e) => updateField(idx, { is_required: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20"
                          />
                          <span className="text-sm text-slate-700">Required field</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {fields.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <Icon name="Inbox" size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No fields yet. Click "Add Field" to get started.</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            {editingTemplate ? (
              <button className="btn-danger" onClick={() => setShowDelete(true)}>
                <Icon name="Trash2" size={16} />
                Delete Template
              </button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={!name.trim() || loading}
              >
                {loading ? (
                  <Icon name="Loader2" size={16} className="animate-spin" />
                ) : (
                  <Icon name="Save" size={16} />
                )}
                {editingTemplate ? 'Save Changes' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Template?"
        message={`This will permanently delete "${editingTemplate?.name}" and all ${fields.length} field(s). Items already collected will NOT be affected.`}
        confirmLabel="Delete"
      />
    </>
  );
}

function OptionsEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (options: string[]) => void;
}) {
  const [input, setInput] = useState('');

  const add = () => {
    const v = input.trim();
    if (v && !options.includes(v)) {
      onChange([...options, v]);
      setInput('');
    }
  };

  const remove = (opt: string) => {
    onChange(options.filter((o) => o !== opt));
  };

  return (
    <div className="space-y-2">
      {options.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {options.map((opt) => (
            <span
              key={opt}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium"
            >
              {opt}
              <button
                onClick={() => remove(opt)}
                className="text-slate-400 hover:text-red-500"
              >
                <Icon name="X" size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          className="field-input flex-1"
          placeholder="Type an option and press Enter…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button className="btn-secondary" onClick={add} disabled={!input.trim()}>
          <Icon name="Plus" size={14} />
          Add
        </button>
      </div>
      <p className="text-xs text-slate-400">
        New options can also be added later while creating an entry.
      </p>
    </div>
  );
}
