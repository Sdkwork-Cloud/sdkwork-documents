import { useTranslation } from 'react-i18next';
import {
  IDE_TOOL_CATEGORY_META,
  IDE_TOOL_CATEGORY_ORDER,
  groupIdeToolProfilesByCategory,
  type IdeToolProfile,
} from '../ideToolProfiles';
import { ToolProtocolBadge } from './ToolProtocolBadge';

interface ToolConfigurationGridProps {
  onSelectTool: (toolId: string) => void;
}

export function ToolConfigurationGrid({ onSelectTool }: ToolConfigurationGridProps) {
  const { t } = useTranslation();
  const groupedProfiles = groupIdeToolProfilesByCategory();

  return (
    <div className="space-y-6 mb-8">
      {IDE_TOOL_CATEGORY_ORDER.map((category) => {
        const profiles = groupedProfiles[category];
        const meta = IDE_TOOL_CATEGORY_META[category];

        return (
          <div key={category}>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              {t(meta.labelKey, meta.fallbackLabel)}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {profiles.map((profile) => (
                <ToolConfigurationCard
                  key={profile.id}
                  profile={profile}
                  onSelect={() => onSelectTool(`tool-${profile.id}`)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ToolConfigurationCard({
  profile,
  onSelect,
}: {
  profile: IdeToolProfile;
  onSelect: () => void;
}) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] p-4 text-left transition-all hover:border-emerald-400 hover:shadow-sm dark:hover:border-emerald-500/40"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
          {t(profile.labelKey, profile.fallbackLabel)}
        </div>
        <ToolProtocolBadge
          profile={profile}
          label={t(profile.protocolKey, profile.fallbackProtocol)}
        />
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
        {t(profile.summaryKey, profile.fallbackSummary)}
      </p>
      <p className="mt-3 text-xs font-mono text-slate-500 dark:text-slate-500 truncate">
        {t(profile.configPathKey, profile.fallbackConfigPath)}
      </p>
    </button>
  );
}
