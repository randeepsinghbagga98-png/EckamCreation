import Link from 'next/link';
import type { AiCancellationResultDto } from '@eckamcreation/api-contracts';
import { orderDetailHref } from '@/lib/ai/orders';
import { safeInternalHref } from '@/lib/ai/safety';

type AiCancellationResultProps = {
  cancellation: AiCancellationResultDto;
};

export function AiCancellationResult({ cancellation }: AiCancellationResultProps) {
  const href = cancellation.orderNumber
    ? safeInternalHref(cancellation.href, orderDetailHref(cancellation.orderNumber))
    : null;

  return (
    <div className="eckam-ai-cancellation" role="status">
      <p>{copyFor(cancellation)}</p>
      {href ? (
        <Link href={href} className="eckam-ai-commerce-cta">
          View Order
        </Link>
      ) : null}
    </div>
  );
}

function copyFor(cancellation: AiCancellationResultDto): string {
  if (cancellation.success) {
    if (cancellation.message && !/prisma|stack|openai|api_key|secret/i.test(cancellation.message)) {
      return cancellation.message;
    }
    if (cancellation.orderNumber) {
      return cancellation.status === 'COMPLETED'
        ? `Order #${cancellation.orderNumber} has been cancelled.`
        : `I've submitted a cancellation request for order #${cancellation.orderNumber}.`;
    }
    return "I've submitted a cancellation request.";
  }

  if (cancellation.message && !/prisma|stack|openai|api_key|secret/i.test(cancellation.message)) {
    return cancellation.message;
  }
  return 'This order can no longer be cancelled.';
}
