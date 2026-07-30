export function SectionCard({ title, subtitle, actions, children, footer }) {
  return (
    <section className="card flex flex-col overflow-hidden">
      <header className="flex flex-col gap-3 border-b border-hairline px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink-primary">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[12px] text-ink-secondary">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      <div className="flex-1">{children}</div>
      {footer}
    </section>
  );
}
