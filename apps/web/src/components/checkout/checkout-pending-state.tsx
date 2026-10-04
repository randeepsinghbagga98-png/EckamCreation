type CheckoutPendingStateProps = {
  message: string;
};

export function CheckoutPendingState({ message }: CheckoutPendingStateProps) {
  return (
    <p className="checkout-notice" role="status" aria-live="polite">
      {message}
    </p>
  );
}
