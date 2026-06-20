import React from 'react';

export const MethodBadge = ({ method }: { method: string }) => {
  const colors: Record<string, string> = {
    GET: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
    POST: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    PUT: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    DELETE: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',
    PATCH: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
  };
  const colorClass = colors[method] || 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300';

  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-[4px] w-12 text-center tracking-wider ${colorClass}`}>
      {method}
    </span>
  );
};
