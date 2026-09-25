import { useState, useEffect, useCallback } from 'react';
import { useTemplates, useTemplateWithFields, useItems, useItemCounts } from '@/lib/hooks';
import type { TemplateWithFields } from '@/lib/types';
import { Icon } from '@/components/Icon';
import { TemplateBuilder } from '@/components/TemplateBuilder';
import { QuickAdd } from '@/components/QuickAdd';
import { ItemsList, ItemEditor } from '@/components/ItemsView';
import { StatisticsView } from '@/components/StatisticsView';

type View = 'items' | 'stats';

interface EditItemData {
  id: string;
  notes: string;
  occurred_at: string;
  field_values: { id: string; item_id: string; field_id: string; value: unknown; created_at: string }[];
  attachments: { id: string; item_id: string; storage_path: string; file_name: string; content_type: string; file_size: number; created_at: string }[];
}

function App() {
  const { templates, loading: templatesLoading, reload: reloadTemplates } = useTemplates();
  const { counts, reload: reloadCounts } = useItemCounts();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const { template, loading: templateLoading, reload: reloadTemplate } = useTemplateWithFields(selectedTemplateId);
  const { items, loading: itemsLoading, reload: reloadItems } = useItems(selectedTemplateId);
  const [view, setView] = useState<View>('items');
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateWithFields | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [editingItem, setEditingItem] = useState<EditItemData | null>(null);
  const [showItemEditor, setShowItemEditor] = useState(false);

  // Auto-select first template
  useEffect(() => {
    if (!selectedTemplateId && templates.length > 0) {
      setSelectedTemplateId(templates[0].id);
    }
    if (selectedTemplateId && !templates.find((t) => t.id === selectedTemplateId)) {
      setSelectedTemplateId(templates[0]?.id ?? null);
    }
  }, [templates, selectedTemplateId]);

  const handleSaved = useCallback(() => {
    reloadTemplates();
    reloadCounts();
    reloadTemplate();
    reloadItems();
  }, [reloadTemplates, reloadCounts, reloadTemplate, reloadItems]);

  const handleOpenEditTemplate = () => {
    if (template) {
      setEditingTemplate(template);
      setShowBuilder(true);
    }
  };

  const handleOpenNewItem = () => {
    setEditingItem(null);
    setShowItemEditor(true);
  };

  const handleEditItem = (item: EditItemData) => {
    setEditingItem(item);
    setShowItemEditor(true);
  };

  const handleItemSaved = () => {
    reloadItems();
    reloadCounts();
  };

  const currentTemplate = template;
  const templateColor = currentTemplate?.color ?? '#3b82f6';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white">
              <Icon name="ClipboardList" size={20} />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">FieldNote</h1>
              <p className="text-xs text-slate-400">Data Collection</p>
            </div>
          </div>
        </div>

        {/* Templates list */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Templates
            </span>
            <button
              onClick={() => {
                setEditingTemplate(null);
                setShowBuilder(true);
              }}
              className="p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              title="New template"
            >
              <Icon name="Plus" size={16} />
            </button>
          </div>

          {templatesLoading ? (
            <div className="flex justify-center py-6 text-slate-400">
              <Icon name="Loader2" size={18} className="animate-spin" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 px-2">
              <p className="text-sm text-slate-400 mb-3">No templates yet</p>
              <button
                onClick={() => {
                  setEditingTemplate(null);
                  setShowBuilder(true);
                }}
                className="btn-primary w-full text-xs py-2"
              >
                <Icon name="Plus" size={14} />
                Create Template
              </button>
            </div>
          ) : (
            <div className="space-y-0.5">
              {templates.map((tmpl) => {
                const isSelected = tmpl.id === selectedTemplateId;
                const count = counts[tmpl.id] ?? 0;
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => setSelectedTemplateId(tmpl.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all ${
                      isSelected
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: isSelected ? tmpl.color : `${tmpl.color}1a`,
                        color: isSelected ? '#fff' : tmpl.color,
                      }}
                    >
                      <Icon name={tmpl.icon} size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tmpl.name}</p>
                    </div>
                    {count > 0 && (
                      <span className="text-xs text-slate-400 tabular-nums">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-slate-100">
          <p className="text-xs text-slate-300 text-center">FieldNote v1.0</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {currentTemplate ? (
          <>
            {/* Top bar */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: templateColor }}
                  >
                    <Icon name={currentTemplate.icon} size={20} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-slate-900 truncate">
                      {currentTemplate.name}
                    </h2>
                    {currentTemplate.description && (
                      <p className="text-sm text-slate-500 truncate">
                        {currentTemplate.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* View toggle */}
                  <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setView('items')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                        view === 'items'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Icon name="Inbox" size={15} />
                      <span className="hidden sm:inline">Entries</span>
                    </button>
                    <button
                      onClick={() => setView('stats')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                        view === 'stats'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Icon name="BarChart3" size={15} />
                      <span className="hidden sm:inline">Stats</span>
                    </button>
                  </div>

                  {/* Edit template */}
                  <button
                    onClick={handleOpenEditTemplate}
                    className="btn-ghost px-2.5"
                    title="Edit template"
                  >
                    <Icon name="Settings" size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto px-6 py-6 pb-28">
              <div className="max-w-3xl mx-auto">
                {templateLoading ? (
                  <div className="flex justify-center py-16 text-slate-400">
                    <Icon name="Loader2" size={24} className="animate-spin" />
                  </div>
                ) : view === 'items' ? (
                  <ItemsList
                    template={currentTemplate}
                    items={items}
                    loading={itemsLoading}
                    onEditItem={handleEditItem}
                  />
                ) : (
                  <StatisticsView template={currentTemplate} items={items} />
                )}
              </div>
            </div>

            {/* Floating add button */}
            <button
              onClick={() => setShowQuickAdd(true)}
              className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl text-white shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center z-20"
              style={{ backgroundColor: templateColor }}
              title="Quick add entry"
            >
              <Icon name="Plus" size={26} />
            </button>
          </>
        ) : (
          // Empty state
          <div className="flex-1 flex items-center justify-center">
            {templatesLoading ? (
              <Icon name="Loader2" size={28} className="animate-spin text-slate-400" />
            ) : (
              <div className="text-center max-w-sm">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Icon name="ClipboardList" size={28} className="text-slate-400" />
                </div>
                <h2 className="text-lg font-semibold text-slate-800 mb-2">
                  Welcome to FieldNote
                </h2>
                <p className="text-sm text-slate-500 mb-6">
                  Create a template to start collecting data. Define the fields you want to
                  track, then quickly add entries on the go.
                </p>
                <button
                  onClick={() => {
                    setEditingTemplate(null);
                    setShowBuilder(true);
                  }}
                  className="btn-primary mx-auto"
                >
                  <Icon name="Plus" size={18} />
                  Create Your First Template
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <TemplateBuilder
        open={showBuilder}
        onClose={() => setShowBuilder(false)}
        editingTemplate={editingTemplate}
        onSaved={handleSaved}
      />

      {showQuickAdd && currentTemplate && (
        <QuickAdd
          template={currentTemplate}
          onClose={() => setShowQuickAdd(false)}
          onSaved={handleSaved}
        />
      )}

      <ItemEditor
        template={currentTemplate ?? ({} as TemplateWithFields)}
        item={editingItem}
        open={showItemEditor}
        onClose={() => setShowItemEditor(false)}
        onSaved={handleItemSaved}
      />
    </div>
  );
}

export default App;
