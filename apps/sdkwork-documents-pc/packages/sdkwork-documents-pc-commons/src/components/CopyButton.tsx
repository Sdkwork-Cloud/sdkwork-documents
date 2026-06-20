import { useEffect, useState } from 'react';
import { AlertCircle, Check, Copy, Loader2 } from 'lucide-react';
import { copyTextToClipboard } from '../clipboard';

export type CopyButtonVariant = 'icon' | 'inline' | 'menu';

export type CopyButtonStatus = 'idle' | 'copying' | 'copied' | 'failed';

export type CopyButtonProps = {
  text: string;
  label?: string;
  copiedLabel?: string;
  errorLabel?: string;
  className?: string;
  iconClassName?: string;
  title?: string;
  disabled?: boolean;
  variant?: CopyButtonVariant;
  onCopied?: () => void;
};

const DEFAULT_LABEL = 'Copy';
const DEFAULT_COPIED_LABEL = 'Copied';
const DEFAULT_ERROR_LABEL = 'Copy failed';

const variantClassNames: Record<CopyButtonVariant, string> = {
  icon: 'inline-flex items-center justify-center rounded-md text-slate-400 transition-colors hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:text-slate-200',
  inline:
    'inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-white/20 dark:hover:text-white',
  menu: 'flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-300 dark:hover:bg-white/5',
};

function statusIconClassName(status: CopyButtonStatus, iconClassName: string): string {
  if (status === 'copied') {
    return `${iconClassName} text-emerald-500`;
  }
  if (status === 'failed') {
    return `${iconClassName} text-red-500`;
  }
  return iconClassName;
}

export function CopyButton({
  text,
  label = DEFAULT_LABEL,
  copiedLabel = DEFAULT_COPIED_LABEL,
  errorLabel = DEFAULT_ERROR_LABEL,
  className = '',
  iconClassName = 'h-4 w-4',
  title,
  disabled = false,
  variant = 'icon',
  onCopied,
}: CopyButtonProps) {
  const [status, setStatus] = useState<CopyButtonStatus>('idle');
  const [message, setMessage] = useState('');
  const isDisabled = disabled || status === 'copying';
  const showText = variant !== 'icon';
  const visibleLabel = status === 'copied' ? copiedLabel : status === 'failed' ? errorLabel : label;
  const buttonTitle = title ?? label;

  useEffect(() => {
    if (status !== 'copied' && status !== 'failed') {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setStatus('idle');
      setMessage('');
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [status]);

  const handleCopy = async () => {
    if (isDisabled) {
      return;
    }

    setStatus('copying');
    setMessage('');

    const result = await copyTextToClipboard(text);
    if (result.ok) {
      setStatus('copied');
      setMessage(copiedLabel);
      onCopied?.();
      return;
    }

    setStatus('failed');
    setMessage(errorLabel);
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      disabled={isDisabled}
      aria-busy={status === 'copying'}
      aria-label={visibleLabel}
      title={buttonTitle}
      className={`${variantClassNames[variant]} ${className}`.trim()}
    >
      {status === 'copying' ? (
        <Loader2 className={`${iconClassName} animate-spin`} aria-hidden="true" />
      ) : status === 'copied' ? (
        <Check className={statusIconClassName(status, iconClassName)} aria-hidden="true" />
      ) : status === 'failed' ? (
        <AlertCircle className={statusIconClassName(status, iconClassName)} aria-hidden="true" />
      ) : (
        <Copy className={iconClassName} aria-hidden="true" />
      )}
      {showText ? <span>{visibleLabel}</span> : null}
      <span role="status" aria-live="polite" className="sr-only">
        {message}
      </span>
    </button>
  );
}
