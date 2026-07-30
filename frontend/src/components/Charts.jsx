import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { useTheme } from '../context/ThemeContext.jsx';
import { formatNumber, formatCurrency, formatDateShort } from '../utils/format.js';

// Validated with the dataviz palette validator against both surfaces:
// single-series blue passes all checks; the red/amber/green severity ramp is the
// widest set that clears the CVD and normal-vision floors (a 4th hue does not).
const SERIES = { light: '#2a78d6', dark: '#3987e5' };
const SEVERITY = { critical: '#d03b3b', low: '#fab219', healthy: '#0ca30c' };

function useChartTheme() {
  const { isDark } = useTheme();
  return {
    series: isDark ? SERIES.dark : SERIES.light,
    grid: isDark ? '#1e1e21' : '#ececee',
    axis: isDark ? '#71717a' : '#a1a1aa',
    surface: isDark ? '#0a0a0a' : '#ffffff',
    tooltipBorder: isDark ? '#232326' : '#e4e4e7',
  };
}

function TooltipCard({ children }) {
  return (
    <div className="rounded-lg border border-hairline bg-surface-card px-2.5 py-2 shadow-lg shadow-black/5">
      {children}
    </div>
  );
}

function OrdersTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const { orders, revenue } = payload[0].payload;

  return (
    <TooltipCard>
      <p className="text-[11px] text-ink-muted">{formatDateShort(label)}</p>
      <p className="num mt-0.5 text-sm font-semibold text-ink-primary">
        {formatNumber(orders)} {orders === 1 ? 'order' : 'orders'}
      </p>
      <p className="num text-[12px] text-ink-secondary">{formatCurrency(revenue)}</p>
    </TooltipCard>
  );
}

function InventoryTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { bucket, range, count } = payload[0].payload;

  return (
    <TooltipCard>
      <p className="num text-sm font-semibold text-ink-primary">
        {formatNumber(count)} {count === 1 ? 'variant' : 'variants'}
      </p>
      <p className="text-[12px] text-ink-secondary">
        {bucket} · {range} in stock
      </p>
    </TooltipCard>
  );
}

function ChartCard({ title, subtitle, action, children }) {
  return (
    <div className="card flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink-primary">{title}</h2>
          <p className="mt-0.5 text-[12px] text-ink-secondary">{subtitle}</p>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

export function OrdersByDayChart({ data }) {
  const t = useChartTheme();
  const total = data.reduce((sum, d) => sum + d.orders, 0);

  return (
    <ChartCard
      title="Orders by day"
      subtitle={`${formatNumber(total)} orders in the last 14 days`}
    >
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke={t.grid} strokeWidth={1} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateShort}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={18}
              tick={{ fill: t.axis, fontSize: 11 }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={44}
              tick={{ fill: t.axis, fontSize: 11 }}
            />
            <Tooltip
              content={<OrdersTooltip />}
              cursor={{ fill: t.grid, fillOpacity: 0.5 }}
            />
            <Bar dataKey="orders" fill={t.series} radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function InventoryDistributionChart({ distribution }) {
  const t = useChartTheme();
  const { buckets, outOfStock } = distribution;
  const totalVariants = buckets.reduce((sum, b) => sum + b.count, 0);

  return (
    <ChartCard
      title="Inventory distribution"
      subtitle={`${formatNumber(totalVariants)} variants by stock level`}
      action={
        outOfStock > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-400/20">
            <span className="h-1.5 w-1.5 rounded-full bg-status-critical" />
            {outOfStock} out of stock
          </span>
        ) : null
      }
    >
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={buckets}
            layout="vertical"
            margin={{ top: 4, right: 34, bottom: 0, left: 4 }}
            barCategoryGap="26%"
          >
            <CartesianGrid horizontal={false} stroke={t.grid} strokeWidth={1} />
            <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: t.axis, fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="bucket"
              tickLine={false}
              axisLine={false}
              width={62}
              tick={{ fill: t.axis, fontSize: 11 }}
            />
            <Tooltip content={<InventoryTooltip />} cursor={{ fill: t.grid, fillOpacity: 0.5 }} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24} label={<BarEndLabel />}>
              {buckets.map((b) => (
                <Cell key={b.bucket} fill={SEVERITY[b.severity]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {buckets.map((b) => (
          <li key={b.bucket} className="flex items-center gap-1.5 text-[11px] text-ink-secondary">
            <span className="h-2 w-2 rounded-sm" style={{ background: SEVERITY[b.severity] }} />
            {b.bucket} · {b.range}
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}

/** Value at the bar tip; text uses ink tokens, never the mark's colour. */
function BarEndLabel({ x, y, width, height, value }) {
  return (
    <text
      x={x + width + 6}
      y={y + height / 2}
      dominantBaseline="central"
      className="num fill-ink-secondary text-[11px]"
    >
      {formatNumber(value)}
    </text>
  );
}
