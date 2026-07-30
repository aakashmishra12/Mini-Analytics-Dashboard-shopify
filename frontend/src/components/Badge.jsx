import { titleCase } from '../utils/format.js';

const TONES = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20',
  warning: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20',
  danger: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-400/20',
  neutral: 'bg-surface-subtle text-ink-secondary ring-hairline',
};

const PAYMENT_TONES = {
  PAID: 'success',
  PENDING: 'warning',
  REFUNDED: 'danger',
  PARTIALLY_REFUNDED: 'warning',
  VOIDED: 'neutral',
  AUTHORIZED: 'neutral',
};

const FULFILLMENT_TONES = {
  FULFILLED: 'success',
  UNFULFILLED: 'neutral',
  PARTIALLY_FULFILLED: 'warning',
  RESTOCKED: 'neutral',
  IN_PROGRESS: 'warning',
};

export function Badge({ tone = 'neutral', children }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset whitespace-nowrap ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export const PaymentBadge = ({ status }) => (
  <Badge tone={PAYMENT_TONES[status] || 'neutral'}>{titleCase(status)}</Badge>
);

export const FulfillmentBadge = ({ status }) => (
  <Badge tone={FULFILLMENT_TONES[status] || 'neutral'}>{titleCase(status)}</Badge>
);
