import { useMemo } from 'react';
import type { TemplateWithFields, ItemFieldValue } from '@/lib/types';
import { formatFieldValue, exportToCSV } from '@/lib/helpers';
import { Icon } from './Icon';

interface StatisticsViewProps {
  template: TemplateWithFields;
  items: {
    id: string;
    occurred_at: string;
    notes: string;
    field_values: ItemFieldValue[];
  }[];
}

export function StatisticsView({ template, items }: StatisticsViewProps) {
  const stats = useMemo(() => {
    if (items.length === 0) return null;

    const now = new Date();
    const last7 = items.filter((i) => {
      const d = new Date(i.occurred_at);
      return (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24) <= 7;
    });
    const last30 = items.filter((i) => {
      const d = new Date(i.occurred_at);
      return (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24) <= 30;
    });

    // Day-of-week distribution
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    for (const item of items) {
      const d = new Date(item.occurred_at);
      dayCounts[d.getDay()]++;
    }

    // Hour distribution
    const hourCounts = new Array(24).fill(0);
    for (const item of items) {
      const d = new Date(item.occurred_at);
      hourCounts[d.getHours()]++;
    }

    // Per-field breakdowns
    const fieldBreakdowns = template.fields.map((field) => {
      const values = items.map((item) => {
        const fv = item.field_values.find((v) => v.field_id === field.id);
        return fv?.value;
      });

      if (field.field_type === 'single_select' || field.field_type === 'text') {
        const counts: Record<string, number> = {};
        for (const v of values) {
          if (v === null || v === undefined || v === '') continue;
          const key = String(v);
          counts[key] = (counts[key] ?? 0) + 1;
        }
        return {
          field,
          type: 'categorical' as const,
          counts: Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .map(([label, count]) => ({ label, count })),
        };
      }

      if (field.field_type === 'multi_select') {
        const counts: Record<string, number> = {};
        for (const v of values) {
          if (!Array.isArray(v)) continue;
          for (const opt of v) {
            counts[opt] = (counts[opt] ?? 0) + 1;
          }
        }
        return {
          field,
          type: 'categorical' as const,
          counts: Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .map(([label, count]) => ({ label, count })),
        };
      }

      if (field.field_type === 'checkbox') {
        const yes = values.filter((v) => v === true).length;
        const no = values.filter((v) => v === false).length;
        return {
          field,
          type: 'categorical' as const,
          counts: [
            { label: 'Yes', count: yes },
            { label: 'No', count: no },
          ],
        };
      }

      if (field.field_type === 'number') {
        const nums = values
          .filter((v) => v !== null && v !== undefined && v !== '')
          .map((v) => Number(v))
          .filter((n) => !isNaN(n));
        if (nums.length === 0) {
          return { field, type: 'number' as const, stats: null };
        }
        const sum = nums.reduce((a, b) => a + b, 0);
        const avg = sum / nums.length;
        const min = Math.min(...nums);
        const max = Math.max(...nums);
        return {
          field,
          type: 'number' as const,
          stats: { avg, min, max, sum, count: nums.length },
        };
      }

      return { field, type: 'other' as const };
    });

    return {
      total: items.length,
      last7: last7.length,
      last30: last30.length,
      dayCounts,
      dayNames,
      hourCounts,
      fieldBreakdowns,
    };
  }, [items, template.fields]);

  const handleExport = () => {
    if (items.length === 0) return;
    const headers = ['Occurred At', ...template.fields.map((f) => f.label), 'Notes'];
    const rows = items.map((item) => [
      new Date(item.occurred_at).toLocaleString(),
      ...template.fields.map((f) => {
        const fv = item.field_values.find((v) => v.field_id === f.id);
        return formatFieldValue(fv?.value, f.field_type);
      }),
      item.notes,
    ]);
    exportToCSV(headers, rows, `${template.name.replace(/\s+/g, '_')}_export.csv`);
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
          <Icon name="BarChart3" size={24} className="text-slate-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-700 mb-1">No data yet</h3>
        <p className="text-sm text-slate-400">
          Collect some entries to see statistics here.
        </p>
      </div>
    );
  }

  if (!stats) return null;

  const maxDayCount = Math.max(...stats.dayCounts);
  const maxHourCount = Math.max(...stats.hourCounts);
  const maxBarCount = Math.max(
    ...stats.fieldBreakdowns
      .filter((fb) => fb.type === 'categorical')
      .flatMap((fb) => (fb.type === 'categorical' ? fb.counts.map((c) => c.count) : []))
  );

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total" value={stats.total} icon="ClipboardList" />
        <StatCard label="Last 7 days" value={stats.last7} icon="TrendingUp" />
        <StatCard label="Last 30 days" value={stats.last30} icon="Calendar" />
      </div>

      {/* Export button */}
      <div className="flex justify-end">
        <button className="btn-secondary" onClick={handleExport}>
          <Icon name="Download" size={16} />
          Export CSV
        </button>
      </div>

      {/* Day of week chart */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">By Day of Week</h3>
        <div className="flex items-end justify-between gap-2 h-32">
          {stats.dayCounts.map((count, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full flex-1 flex items-end">
                <div
                  className="w-full rounded-t-md transition-all hover:opacity-80"
                  style={{
                    height: maxDayCount > 0 ? `${(count / maxDayCount) * 100}%` : '2px',
                    minHeight: count > 0 ? '8px' : '2px',
                    backgroundColor: template.color,
                    opacity: count > 0 ? 1 : 0.15,
                  }}
                />
              </div>
              <span className="text-xs text-slate-500 font-medium">{stats.dayNames[i]}</span>
              <span className="text-xs text-slate-400">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Time of day chart */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">By Time of Day</h3>
        <div className="flex items-end justify-between gap-0.5 h-24">
          {stats.hourCounts.map((count, i) => (
            <div key={i} className="flex-1 flex flex-col items-center group relative">
              <div className="w-full flex-1 flex items-end">
                <div
                  className="w-full rounded-t-sm transition-all hover:opacity-80"
                  style={{
                    height: maxHourCount > 0 ? `${(count / maxHourCount) * 100}%` : '1px',
                    minHeight: count > 0 ? '4px' : '1px',
                    backgroundColor: template.color,
                    opacity: count > 0 ? 1 : 0.12,
                  }}
                />
              </div>
              {i % 6 === 0 && (
                <span className="text-xs text-slate-400 mt-1.5">{i}:00</span>
              )}
              {count > 0 && (
                <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none">
                  {count} at {i}:00
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Field breakdowns */}
      <div className="space-y-4">
        {stats.fieldBreakdowns.map((fb, idx) => {
          if (fb.type === 'categorical' && fb.counts.length > 0) {
            return (
              <div key={idx} className="card p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">{fb.field.label}</h3>
                <div className="space-y-2.5">
                  {fb.counts.map(({ label, count }) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-sm text-slate-600 w-28 shrink-0 truncate">
                        {label}
                      </span>
                      <div className="flex-1 h-6 bg-slate-50 rounded-lg overflow-hidden">
                        <div
                          className="h-full rounded-lg transition-all flex items-center justify-end pr-2"
                          style={{
                            width: maxBarCount > 0 ? `${(count / maxBarCount) * 100}%` : '0%',
                            backgroundColor: template.color,
                            opacity: 0.85,
                            minWidth: count > 0 ? '32px' : '0',
                          }}
                        >
                          <span className="text-xs font-semibold text-white">{count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          if (fb.type === 'number' && fb.stats) {
            return (
              <div key={idx} className="card p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">{fb.field.label}</h3>
                <div className="grid grid-cols-4 gap-3">
                  <NumberStat label="Average" value={fb.stats.avg.toFixed(1)} />
                  <NumberStat label="Min" value={String(fb.stats.min)} />
                  <NumberStat label="Max" value={String(fb.stats.max)} />
                  <NumberStat label="Sum" value={String(fb.stats.sum)} />
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
          <Icon name={icon} size={15} />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}

function NumberStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-lg font-bold text-slate-900 tabular-nums">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}
