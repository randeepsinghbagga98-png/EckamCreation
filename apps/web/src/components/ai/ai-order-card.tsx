import Link from 'next/link';
import type { AiOrderSummaryDto } from '@eckamcreation/api-contracts';
import {
  orderDateLabel,
  orderDetailHref,
  orderItemSummary,
  orderStatusLabel,
  orderTotalLabel,
} from '@/lib/ai/orders';
import { safeInternalHref } from '@/lib/ai/safety';

type AiOrderCardProps = {
  order: AiOrderSummaryDto;
};

export function AiOrderCard({ order }: AiOrderCardProps) {
  const href = safeInternalHref(order.href, orderDetailHref(order.orderNumber));
  const status = orderStatusLabel(order.status);
  const total = orderTotalLabel(order);
  const date = orderDateLabel(order);
  const items = orderItemSummary(order);

  return (
    <article className="eckam-ai-order-card">
      {status ? <p className="eckam-ai-product-category">{status}</p> : null}
      <h4>Order {order.orderNumber}</h4>
      {date || total ? (
        <p className="eckam-ai-order-meta">
          {[date, total].filter(Boolean).join(' · ')}
        </p>
      ) : null}
      {items ? <p className="eckam-ai-order-items">{items}</p> : null}
      <Link href={href} className="eckam-ai-product-cta">
        View Order
      </Link>
    </article>
  );
}
