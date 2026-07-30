import { useTheme } from '../context/ThemeContext.jsx';
import { Spinner } from './States.jsx';
import { IconRefresh, IconSun, IconMoon } from './Icons.jsx';
import { formatRelativeTime } from '../utils/format.js';

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="btn px-2"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? <IconSun width={14} height={14} /> : <IconMoon width={14} height={14} />}
    </button>
  );
}

export function Header({ shopName, dataSource, lastUpdated, onRefresh, refreshing }) {
  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-surface-page-blur backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink-primary text-surface-card">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M4 20V10h4v10H4Zm6 0V4h4v16h-4Zm6 0v-7h4v7h-4Z" />
            </svg>
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-semibold leading-tight tracking-tight text-ink-primary">
              {shopName || 'Store analytics'}
            </h1>
            <p className="flex items-center gap-1.5 text-[12px] text-ink-secondary">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  dataSource === 'shopify' ? 'bg-status-good' : 'bg-status-warning'
                }`}
              />
              {dataSource === 'shopify' ? 'Live Shopify data' : 'Demo data'}
              <span className="text-ink-muted">·</span>
              <span className="truncate">Updated {formatRelativeTime(lastUpdated)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button type="button" onClick={onRefresh} disabled={refreshing} className="btn btn-primary">
            {refreshing ? <Spinner className="h-3.5 w-3.5" /> : <IconRefresh width={13} height={13} />}
            {refreshing ? 'Refreshing…' : 'Refresh data'}
          </button>
        </div>
      </div>
    </header>
  );
}
