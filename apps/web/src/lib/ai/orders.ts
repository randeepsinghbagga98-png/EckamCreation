import type { AiOrderSummaryDto } from '@eckamcreation/api-contracts';
import { formatAccountDate, formatAccountMoney, formatOrderStatus } from '@/lib/account/presentation';

export function orderDetailHref(orderNumber: string): string {
  return `/account/orders/${encodeURIComponent(orderNumber)}`;
}

export function orderTotalLabel(order: AiOrderSummaryDto): string | null {
  if (!order.total) {
    return null;
  }
  return formatAccountMoney(order.total);
}

export function orderDateLabel(order: Pick<AiOrderSummaryDto, 'createdAt'>): string | null {
  if (!order.createdAt) {
    return null;
  }
  return formatAccountDate(order.createdAt);
}

export function orderStatusLabel(status: string | undefined): string | null {
  if (!status) {
    return null;
  }
  return formatOrderStatus(status);
}

export function orderItemSummary(order: AiOrderSummaryDto): string | null {
  if (order.items && order.items.length > 0) {
    return order.items
      .map((item) => `${item.productName}${item.quantity > 1 ? ` × ${item.quantity}` : ''}`)
      .join(', ');
  }
  if (typeof order.itemCount === 'number') {
    return order.itemCount === 1 ? '1 item' : `${order.itemCount} items`;
  }
  return null;
}
