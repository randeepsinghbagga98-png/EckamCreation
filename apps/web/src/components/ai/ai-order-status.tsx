import Link from 'next/link';
import type { AiOrderStatusDto } from '@eckamcreation/api-contracts';
import { orderDetailHref, orderStatusLabel } from '@/lib/ai/orders';
import { safeInternalHref } from '@/lib/ai/safety';

type AiOrderStatusProps = {
  status: AiOrderStatusDto;
};

export function AiOrderStatus({ status }: AiOrderStatusProps) {
  const href = status.orderNumber
    ? safeInternalHref(status.href, orderDetailHref(status.orderNumber))
    : null;
  const label = orderStatusLabel(status.status);

  return (
    <div className="eckam-ai-order-status" role="status">
      <p>
        {status.success
          ? status.orderNumber
            ? `Order ${status.orderNumber}`
            : 'Order status'
          : safeMessage(status.message) ?? "I couldn't find that order."}
      </p>
      {status.success && label ? (
        <p className="eckam-ai-order-status-number">{label}</p>
      ) : null}
      {status.success && href ? (
        <Link href={href} className="eckam-ai-commerce-cta">
          View Order
        </Link>
      ) : null}
    </div>
  );
}

function safeMessage(message: string | undefined): string | undefined {
  if (!message || /prisma|stack|openai|api_key|secret/i.test(message)) {
    return undefined;
  }
  return message;
}
