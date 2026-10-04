type CartErrorStateProps = {
  onRetry: () => void;
};

export function CartErrorState({ onRetry }: CartErrorStateProps) {
  return (
    <div className="cart-empty" role="alert">
      <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-[#8B6914]">
        We couldn&apos;t load your cart
      </p>
      <p className="mt-5 max-w-md text-[15px] font-light leading-relaxed text-[#1A1815]/70">
        Please try again.
      </p>
      <button type="button" className="cart-cta cart-cta--primary mt-8" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
