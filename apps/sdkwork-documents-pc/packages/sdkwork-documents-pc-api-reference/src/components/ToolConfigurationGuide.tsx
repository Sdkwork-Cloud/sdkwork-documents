import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { IdeToolProfile } from '../ideToolProfiles';

interface ToolConfigurationGuideProps {
  profile: IdeToolProfile;
}

function parseSteps(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\d+\.\s*/, ''));
}

export function ToolConfigurationGuide({ profile }: ToolConfigurationGuideProps) {
  const { t } = useTranslation();
  const hint = t(profile.hintKey, profile.fallbackHint);
  const steps = parseSteps(t(profile.stepsKey, profile.fallbackSteps));
  const verify = profile.verifyKey
    ? t(profile.verifyKey, profile.fallbackVerify ?? '')
    : '';

  return (
    <div className="mb-6 space-y-4">
      <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50/80 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
        <AlertCircle className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
        <p className="text-sm text-blue-900 dark:text-blue-200/90 leading-relaxed">{hint}</p>
      </div>

      {steps.length > 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] p-4">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
            {t('docs.page.toolConfigStepsTitle', 'Configuration steps')}
          </h4>
          <ol className="space-y-2">
            {steps.map((step) => (
              <li key={step} className="flex gap-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {verify ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {verify}
        </p>
      ) : null}
    </div>
  );
}
