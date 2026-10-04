import type { AiChatMessage } from '@/lib/ai/types';
import { AiCancellationResult } from './ai-cancellation-result';
import { AiCommerceResult } from './ai-commerce-result';
import { AiOrderList } from './ai-order-list';
import { AiOrderStatus } from './ai-order-status';
import { AiProductCard } from './ai-product-card';
import { AiProductComparison } from './ai-product-comparison';
import { AiTrackingResult } from './ai-tracking-result';
import { AssistantRichText } from './assistant-rich-text';

type AssistantMessageProps = {
  message: AiChatMessage;
};

export function AssistantMessage({ message }: AssistantMessageProps) {
  return (
    <article className="eckam-ai-turn" aria-label="Eckam AI message">
      <div className="eckam-ai-bubble eckam-ai-bubble--assistant">
        <AssistantRichText content={message.content} />
      </div>
      {message.commerce ? <AiCommerceResult commerce={message.commerce} /> : null}
      {message.comparison ? <AiProductComparison comparison={message.comparison} /> : null}
      {message.cancellation ? <AiCancellationResult cancellation={message.cancellation} /> : null}
      {message.orderStatus ? <AiOrderStatus status={message.orderStatus} /> : null}
      {message.tracking ? <AiTrackingResult tracking={message.tracking} /> : null}
      {message.orders && message.orders.length > 0 ? <AiOrderList orders={message.orders} /> : null}
      {message.products && message.products.length > 0 && !message.comparison ? (
        <div className="eckam-ai-products">
          {message.products.map((product) => (
            <AiProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : null}
    </article>
  );
}
