import { IconSearch, IconXCircle } from './Icons.jsx';

export function SearchInput({ value, onChange, placeholder = 'Search…', label }) {
  return (
    <div className="relative w-full sm:w-56">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted">
        <IconSearch width={14} height={14} />
      </span>
      <input
        type="search"
        value={value}
        aria-label={label || placeholder}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-hairline bg-surface-card py-1.5 pl-8 pr-8 text-[13px]
                   text-ink-primary placeholder:text-ink-muted
                   focus:border-hairline-strong [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded text-ink-muted hover:text-ink-primary"
        >
          <IconXCircle width={14} height={14} />
        </button>
      )}
    </div>
  );
}
