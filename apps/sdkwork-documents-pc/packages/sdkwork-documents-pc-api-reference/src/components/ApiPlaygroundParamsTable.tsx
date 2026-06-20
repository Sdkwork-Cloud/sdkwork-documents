import React, { useState } from 'react';
import { Trash2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ParamRow } from '../apiPlaygroundRows';

export type { ParamRow } from '../apiPlaygroundRows';

interface ApiPlaygroundParamsTableProps {
  title: string;
  params: ParamRow[];
  errors: Record<string, boolean>;
  onChange: (id: string, field: keyof ParamRow, value: ParamRow[keyof ParamRow]) => void;
  onRemove: (id: string) => void;
  hideEnabled?: boolean;
  hideDescription?: boolean;
  onBulkEdit?: (text: string) => void;
}

export function ApiPlaygroundParamsTable({
  title,
  params,
  errors,
  onChange,
  onRemove,
  hideEnabled = false,
  hideDescription = false,
  onBulkEdit,
}: ApiPlaygroundParamsTableProps) {
  const { t } = useTranslation();
  const [isBulkEdit, setIsBulkEdit] = useState(false);
  const [bulkText, setBulkText] = useState('');

  if (params.length === 0) return null;

  const handleToggleBulkEdit = () => {
    if (!isBulkEdit) {
      // Convert params to text
      const text = params
        .filter(p => p.key || p.value)
        .map(p => `${p.enabled ? '' : '// '}${p.key}:${p.value}`)
        .join('\n');
      setBulkText(text);
    } else {
      // Convert text to params
      if (onBulkEdit) {
        onBulkEdit(bulkText);
      }
    }
    setIsBulkEdit(!isBulkEdit);
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h4>
        {onBulkEdit && (
          <button
            onClick={handleToggleBulkEdit}
            className="text-[12px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            {isBulkEdit ? t('common.actions.keyValueEdit') : t('common.actions.bulkEdit')}
          </button>
        )}
      </div>
      <div className="border border-slate-200 dark:border-white/10 rounded-md overflow-hidden">
        {isBulkEdit ? (
          <div className="bg-white dark:bg-[#0d1117] p-0">
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="key:value"
              className="w-full h-48 p-3 text-[13px] font-mono text-slate-800 dark:text-slate-200 bg-transparent focus:outline-none resize-y"
              spellCheck={false}
            />
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#161b22]">
              {!hideEnabled && (
                <th className="w-10 px-2 py-2 border-r border-slate-200 dark:border-white/10 text-center"></th>
              )}
              <th className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-white/10 w-[30%]">Key</th>
              <th className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-white/10 w-[30%]">Value</th>
              {!hideDescription && (
                <th className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 w-[40%]">Description</th>
              )}
              {!hideEnabled && (
                <th className="w-10 px-2 py-2"></th>
              )}
            </tr>
          </thead>
          <tbody>
            {params.map((p, index) => (
              <tr key={p.id} className="border-b border-slate-200 dark:border-white/10 group hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                {!hideEnabled && (
                  <td className="px-2 py-1.5 border-r border-slate-200 dark:border-white/10 text-center align-middle">
                    <input
                      type="checkbox"
                      checked={p.required ? true : p.enabled}
                      disabled={p.required}
                      onChange={(e) => onChange(p.id, 'enabled', e.target.checked)}
                      className={`rounded border-slate-300 text-blue-600 focus:ring-blue-500 ${p.required ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    />
                  </td>
                )}
                <td className={`border-r border-slate-200 dark:border-white/10 relative p-0 ${hideEnabled ? 'bg-slate-50/30 dark:bg-[#161b22]/30' : ''}`}>
                  <input
                    type="text"
                    value={p.key}
                    onChange={(e) => onChange(p.id, 'key', e.target.value)}
                    placeholder="Key"
                    className={`w-full h-full px-3 py-2 text-[13px] bg-transparent focus:outline-none focus:bg-white dark:focus:bg-[#0d1117] font-mono text-slate-800 dark:text-slate-200 placeholder:font-sans ${hideEnabled ? 'cursor-default text-slate-700 dark:text-slate-300' : ''}`}
                    readOnly={p.isSchema || hideEnabled}
                  />
                  {p.required && <span className="absolute right-2 top-2.5 text-[9px] text-red-500 font-bold uppercase tracking-wider">Req</span>}
                </td>
                <td className="border-r border-slate-200 dark:border-white/10 p-0">
                  <div className="relative w-full h-full">
                    <input
                      type="text"
                      value={p.value}
                      onChange={(e) => onChange(p.id, 'value', e.target.value)}
                      placeholder={errors[p.id] ? "Required" : "Value"}
                      className={`w-full h-full px-3 py-2 text-[13px] bg-transparent focus:outline-none focus:bg-white dark:focus:bg-[#0d1117] font-mono placeholder:font-sans ${errors[p.id] ? 'bg-red-50/80 dark:bg-red-900/20 text-red-700 dark:text-red-400 placeholder:text-red-400/70' : 'text-slate-800 dark:text-slate-200'}`}
                    />
                    {errors[p.id] && <AlertCircle className="absolute right-2 top-2.5 w-4 h-4 text-red-500" />}
                  </div>
                </td>
                {!hideDescription && (
                  <td className="p-0">
                    <input
                      type="text"
                      value={p.description}
                      onChange={(e) => onChange(p.id, 'description', e.target.value)}
                      placeholder="Description"
                      className={`w-full h-full px-3 py-2 text-[13px] bg-transparent focus:outline-none focus:bg-white dark:focus:bg-[#0d1117] text-slate-600 dark:text-slate-400 ${hideEnabled ? 'cursor-default' : ''}`}
                      readOnly={p.isSchema || hideEnabled}
                    />
                  </td>
                )}
                {!hideEnabled && (
                  <td className="px-2 py-1.5 text-center align-middle">
                    {!p.isSchema && index !== params.length - 1 && (
                      <button
                        onClick={() => onRemove(p.id)}
                        className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10"
                        title={t('common.actions.removeParameter')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
}
