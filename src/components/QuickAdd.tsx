import { useState, useRef, useEffect } from 'react';
import type { TemplateWithFields } from '@/lib/types';
import { createItem, uploadAttachment } from '@/lib/api';
import { getDefaultForField, isFieldEmpty, formatDateTimeLocal, toISOFromLocal } from '@/lib/helpers';
import { Modal } from './Modal';
import { Icon } from './Icon';
import { FieldInput } from './FieldInput';

interface QuickAddProps {
  template: TemplateWithFields;
  onClose: () => void;
  onSaved: () => void;
}

export function QuickAdd({ template, onClose, onSaved }: QuickAddProps) {
  const [expanded, setExpanded] = useState(false);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [notes, setNotes] = useState('');
  const [occurredAt, setOccurredAt] = useState<string>(new Date().toISOString());
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init: Record<string, unknown> = {};
    for (const f of template.fields) {
      init[f.id] = getDefaultForField(f);
    }
    setValues(init);
  }, [template]);

  const setValue = (fieldId: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    setFiles((prev) => [...prev, ...Array.from(fileList)]);
  };

  const removeFile = (idx: number) => {
    setFiles(files.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);

    // Validate required fields
    for (const f of template.fields) {
      if (f.is_required && isFieldEmpty(values[f.id], f.field_type)) {
        setExpanded(true);
        setSaving(false);
        return;
      }
    }

    const itemId = await createItem(
      template.id,
      values,
      template.fields,
      occurredAt,
      notes
    );

    if (itemId && files.length > 0) {
      for (const file of files) {
        await uploadAttachment(itemId, file);
      }
    }

    setSaving(false);
    onSaved();
    onClose();
  };

  const quickFields = template.fields.slice(0, 3);
  const hasMoreFields = template.fields.length > 3;

  return (
    <Modal
      open
      onClose={onClose}
      title={template.name}
      subtitle="Quick Add"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Occurred at */}
        <div>
          <label className="label">When did this happen?</label>
          <input
            type="datetime-local"
            className="field-input"
            value={formatDateTimeLocal(occurredAt)}
            onChange={(e) => {
              if (e.target.value) setOccurredAt(toISOFromLocal(e.target.value));
            }}
          />
        </div>

        {/* Quick fields (always visible) */}
        <div className="space-y-3">
          {quickFields.map((field) => (
            <FieldInput
              key={field.id}
              field={field}
              value={values[field.id]}
              onChange={(v) => setValue(field.id, v)}
            />
          ))}
        </div>

        {/* Expand for more */}
        {hasMoreFields && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              <Icon name={expanded ? 'ChevronUp' : 'ChevronDown'} size={16} />
              {expanded ? 'Show less' : `Show all ${template.fields.length} fields`}
            </button>

            {expanded && (
              <div className="space-y-3 pt-1 animate-slide-up">
                {template.fields.slice(3).map((field) => (
                  <FieldInput
                    key={field.id}
                    field={field}
                    value={values[field.id]}
                    onChange={(v) => setValue(field.id, v)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Notes */}
        {(expanded || template.fields.length <= 3) && (
          <div className="animate-fade-in">
            <label className="label">Notes (optional)</label>
            <textarea
              className="field-input min-h-[60px] resize-y"
              placeholder="Any additional context…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        )}

        {/* Attachments */}
        <div>
          <label className="label">Photos & Files (optional)</label>
          <div className="flex gap-2">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="btn-secondary flex-1"
            >
              <Icon name="Camera" size={16} />
              Camera
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary flex-1"
            >
              <Icon name="Paperclip" size={16} />
              Files
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {files.map((file, idx) => (
                <div
                  key={idx}
                  className="relative group inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 text-xs text-slate-600"
                >
                  <Icon name={file.type.startsWith('image/') ? 'Image' : 'File'} size={14} />
                  <span className="max-w-[120px] truncate">{file.name}</span>
                  <button
                    onClick={() => removeFile(idx)}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <Icon name="X" size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button className="btn-secondary flex-1" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary flex-1"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <Icon name="Loader2" size={16} className="animate-spin" />
            ) : (
              <Icon name="Check" size={16} />
            )}
            Save Entry
          </button>
        </div>
      </div>
    </Modal>
  );
}
