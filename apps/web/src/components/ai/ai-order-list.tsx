import type { AiOrderSummaryDto } from '@eckamcreation/api-contracts';
import { AiOrderCard } from './ai-order-card';

type AiOrderListProps = {
  orders: AiOrderSummaryDto[];
};

export function AiOrderList({ orders }: AiOrderListProps) {
  if (orders.length === 0) {
    return null;
  }

  return (
    <div className="eckam-ai-orders" aria-label="Your orders">
      {orders.map((order) => (
        <AiOrderCard key={order.orderNumber} order={order} />
      ))}
    </div>
  );
}
