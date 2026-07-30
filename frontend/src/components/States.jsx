import { IconAlert, IconInbox, IconRefresh } from './Icons.jsx';

export function Spinner({ className = 'h-4 w-4' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-90"
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function FullPageLoader({ label = 'Loading your store data' }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3" role="status">
      <Spinner className="h-6 w-6 text-ink-secondary" />
      <p className="text-sm text-ink-secondary">{label}</p>
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function EmptyState({ title = 'Nothing to show', message, icon: Icon = IconInbox }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-subtle text-ink-muted">
        <Icon width={18} height={18} />
      </span>
      <p className="text-sm font-medium text-ink-primary">{title}</p>
      {message && <p className="max-w-xs text-[13px] text-ink-secondary">{message}</p>}
    </div>
  );
}

export function ErrorState({ error, onRetry, compact = false }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 px-6 text-center ${compact ? 'py-8' : 'py-12'}`}
      role="alert"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
        <IconAlert width={18} height={18} />
      </span>
      <p className="text-sm font-medium text-ink-primary">Couldn’t load this section</p>
      <p className="max-w-sm text-[13px] text-ink-secondary">
        {error?.message || 'An unexpected error occurred.'}
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn mt-1">
          <IconRefresh width={13} height={13} />
          Try again
        </button>
      )}
    </div>
  );
}
