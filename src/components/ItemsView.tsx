import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { TemplateWithFields, ItemFieldValue, ItemAttachment } from '@/lib/types';
import {
  updateItem,
  deleteItem,
  uploadAttachment,
  deleteAttachment,
  getAttachmentUrl,
} from '@/lib/api';
import {
  getDefaultForField,
  isFieldEmpty,
  formatFieldValue,
  formatDateTimeLocal,
  toISOFromLocal,
  formatRelativeTime,
} from '@/lib/helpers';
import { Modal, ConfirmDialog } from './Modal';
import { Icon } from './Icon';
import { FieldInput } from './FieldInput';

interface ItemEditorProps {
  template: TemplateWithFields;
  item: {
    id: string;
    notes: string;
    occurred_at: string;
    field_values: ItemFieldValue[];
    attachments: ItemAttachment[];
  } | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function ItemEditor({ template, item, open, onClose, onSaved }: ItemEditorProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [notes, setNotes] = useState('');
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString());
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [attachments, setAttachments] = useState<ItemAttachment[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [initialized, setInitialized] = useState(false);

  // Initialize when opening
  const initFromItem = () => {
    if (item) {
      const v: Record<string, unknown> = {};
      for (const f of template.fields) {
        const fv = item.field_values.find((val) => val.field_id === f.id);
        v[f.id] = fv?.value ?? getDefaultForField(f);
      }
      setValues(v);
      setNotes(item.notes ?? '');
      setOccurredAt(item.occurred_at);
      setAttachments(item.attachments ?? []);
    } else {
      const v: Record<string, unknown> = {};
      for (const f of template.fields) {
        v[f.id] = getDefaultForField(f);
      }
      setValues(v);
      setNotes('');
      setOccurredAt(new Date().toISOString());
      setAttachments([]);
    }
  };

  if (open && !initialized) {
    initFromItem();
    setInitialized(true);
  }
  if (!open && initialized) {
    setInitialized(false);
  }

  const setValue = (fieldId: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || !item) return;
    setUploadingCount(fileList.length);
    for (const file of Array.from(fileList)) {
      const attId = await uploadAttachment(item.id, file);
      if (attId) {
        const { data } = await supabase
          .from('item_attachments')
          .select('*')
          .eq('item_id', item.id);
        if (data) setAttachments(data);
      }
    }
    setUploadingCount(0);
  };

  const handleDeleteAttachment = async (attId: string, storagePath: string) => {
    await deleteAttachment(attId, storagePath);
    setAttachments(attachments.filter((a) => a.id !== attId));
  };

  const handleSave = async () => {
    if (!item) return;
    setSaving(true);
    for (const f of template.fields) {
      if (f.is_required && isFieldEmpty(values[f.id], f.field_type)) {
        setSaving(false);
        return;
      }
    }
    await updateItem(item.id, values, template.fields, occurredAt, notes);
    setSaving(false);
    onSaved();
    onClose();
  };

  const handleDelete = async () => {
    if (!item) return;
    await deleteItem(item.id);
    onSaved();
    onClose();
  };

  if (!item) return null;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Edit Entry"
        subtitle={`From ${template.name}`}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
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

          {template.fields.map((field) => (
            <FieldInput
              key={field.id}
              field={field}
              value={values[field.id]}
              onChange={(v) => setValue(field.id, v)}
            />
          ))}

          <div>
            <label className="label">Notes</label>
            <textarea
              className="field-input min-h-[70px] resize-y"
              placeholder="Additional context…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="label">Photos & Files</label>
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

            {attachments.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {attachments.map((att) => (
                  <div key={att.id} className="relative group">
                    {att.content_type.startsWith('image/') ? (
                      <img
                        src={getAttachmentUrl(att.storage_path)}
                        alt={att.file_name}
                        className="w-full h-24 object-cover rounded-lg border border-slate-200"
                      />
                    ) : (
                      <div className="w-full h-24 flex flex-col items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50">
                        <Icon name="File" size={20} className="text-slate-400" />
                        <span className="text-xs text-slate-500 max-w-full px-1 truncate">
                          {att.file_name}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => handleDeleteAttachment(att.id, att.storage_path)}
                      className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Icon name="X" size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {uploadingCount > 0 && (
              <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                <Icon name="Loader2" size={14} className="animate-spin" />
                Uploading {uploadingCount} file(s)…
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button className="btn-danger" onClick={() => setShowDelete(true)}>
              <Icon name="Trash2" size={16} />
              Delete
            </button>
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <Icon name="Loader2" size={16} className="animate-spin" />
                ) : (
                  <Icon name="Save" size={16} />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Entry?"
        message="This will permanently delete this entry and all its attachments. This cannot be undone."
        confirmLabel="Delete"
      />
    </>
  );
}

interface ItemsListProps {
  template: TemplateWithFields;
  items: {
    id: string;
    notes: string;
    occurred_at: string;
    field_values: ItemFieldValue[];
    attachments: ItemAttachment[];
  }[];
  loading: boolean;
  onEditItem: (item: {
    id: string;
    notes: string;
    occurred_at: string;
    field_values: ItemFieldValue[];
    attachments: ItemAttachment[];
  }) => void;
}

export function ItemsList({ template, items, loading, onEditItem }: ItemsListProps) {
  const primaryFields = template.fields.slice(0, 2);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Icon name="Loader2" size={24} className="animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
          <Icon name="Inbox" size={24} className="text-slate-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-700 mb-1">No entries yet</h3>
        <p className="text-sm text-slate-400">
          Use the + button below to add your first entry.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onEditItem(item)}
          className="w-full text-left card p-4 hover:shadow-md hover:border-slate-300 transition-all active:scale-[0.99] group"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-1.5">
              {primaryFields.map((field) => {
                const fv = item.field_values.find((v) => v.field_id === field.id);
                const val = formatFieldValue(fv?.value, field.field_type);
                return (
                  <div key={field.id} className="flex items-baseline gap-2">
                    <span className="text-xs font-medium text-slate-400 whitespace-nowrap shrink-0">
                      {field.label}
                    </span>
                    <span className="text-sm text-slate-800 truncate">{val}</span>
                  </div>
                );
              })}
              {item.notes && (
                <p className="text-sm text-slate-500 truncate">{item.notes}</p>
              )}
              <div className="flex items-center gap-3 pt-0.5">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Icon name="Clock" size={12} />
                  {formatRelativeTime(item.occurred_at)}
                </span>
                {item.attachments.length > 0 && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Icon name="Paperclip" size={12} />
                    {item.attachments.length}
                  </span>
                )}
              </div>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <Icon name="ChevronRight" size={18} className="text-slate-400" />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
