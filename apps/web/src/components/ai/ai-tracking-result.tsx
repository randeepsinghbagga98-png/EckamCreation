import Link from 'next/link';
import type { AiTrackingResultDto } from '@eckamcreation/api-contracts';
import { formatAccountDate } from '@/lib/account/presentation';
import { orderDetailHref } from '@/lib/ai/orders';
import { safeInternalHref } from '@/lib/ai/safety';

type AiTrackingResultProps = {
  tracking: AiTrackingResultDto;
};

export function AiTrackingResult({ tracking }: AiTrackingResultProps) {
  const href = tracking.orderNumber
    ? safeInternalHref(tracking.href, orderDetailHref(tracking.orderNumber))
    : null;

  if (!tracking.success) {
    return (
      <div className="eckam-ai-tracking" role="status">
        <p>
          {safeMessage(tracking.message) ??
            "Tracking information isn't available for this order yet."}
        </p>
        {href ? (
          <Link href={href} className="eckam-ai-commerce-cta">
            View Order
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="eckam-ai-tracking" role="status">
      <p>
        {tracking.orderNumber
          ? `Tracking for order ${tracking.orderNumber}`
          : 'Tracking'}
      </p>
      {tracking.carrier ? <p className="eckam-ai-tracking-number">{tracking.carrier}</p> : null}
      {tracking.trackingNumber ? (
        <p className="eckam-ai-tracking-number">{tracking.trackingNumber}</p>
      ) : null}
      {tracking.status ? <p className="eckam-ai-order-items">{tracking.status.replace(/_/g, ' ')}</p> : null}
      {tracking.events && tracking.events.length > 0 ? (
        <ul className="eckam-ai-tracking-events">
          {tracking.events.map((event, index) => (
            <li key={`${event.status}-${event.occurredAt ?? index}`}>
              {event.status.replace(/_/g, ' ')}
              {event.location ? ` · ${event.location}` : ''}
              {event.occurredAt ? ` · ${formatAccountDate(event.occurredAt)}` : ''}
            </li>
          ))}
        </ul>
      ) : null}
      {href ? (
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
