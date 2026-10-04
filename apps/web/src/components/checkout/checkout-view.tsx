'use client';

import { useEffect, useId, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { getGuestToken } from '@/lib/cart/identity';
import { useCart } from '@/lib/cart/store';
import {
  completeCheckoutSession,
  createCheckoutSession,
  getCheckoutSession,
  patchCheckoutSession,
} from '@/lib/checkout/api';
import {
  canCreateServerCheckout,
  firstShippingMethodId,
  firstErrorMessage,
  isCheckoutReadyForPayment,
  LOCAL_PREVIEW_CHECKOUT_MESSAGE,
  messageForCheckoutError,
  SHIPPING_UNAVAILABLE_MESSAGE,
  createCheckoutPresentation,
  toCheckoutCreateInput,
  toCheckoutGuestAddress,
} from '@/lib/checkout/presentation';
import type { CheckoutAddress, CheckoutFieldKey, CheckoutStatus } from '@/lib/checkout/types';
import { validateCheckoutForm } from '@/lib/checkout/validation';
import { createPaymentIntent, getPaymentIntent } from '@/lib/payment/api';
import {
  isPaymentActionLocked,
  messageForPaymentError,
  PAYMENT_READY_TITLE,
  paymentFromIntent,
  paymentReadyCopy,
} from '@/lib/payment/presentation';
import { CheckoutEmptyState } from './checkout-empty-state';
import { CheckoutForm } from './checkout-form';
import { CheckoutOrderSummary } from './checkout-order-summary';
import { CheckoutSkeleton } from './checkout-skeleton';

export function CheckoutView() {
  const cart = useCart();
  const reduceMotion = useReducedMotion();
  const formId = useId();
  const submittingRef = useRef(false);
  const checkoutIdempotencyKeyRef = useRef<string | null>(null);
  const paymentIdempotencyKeyRef = useRef<string | null>(null);
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [checkout, setCheckout] = useState(createCheckoutPresentation);

  useEffect(() => {
    if (checkout.status !== 'validation-error') {
      return;
    }

    const invalid = document.getElementById(formId)?.querySelector<HTMLElement>(
      '[aria-invalid="true"]',
    );
    invalid?.focus();
  }, [checkout.status, checkout.errors, formId]);

  const status: CheckoutStatus =
    !hydrated || cart.status === 'loading'
      ? 'loading'
      : cart.status === 'error'
        ? 'error'
        : cart.items.length === 0
          ? 'empty'
          : checkout.status;

  if (status === 'loading') {
    return <CheckoutSkeleton />;
  }

  if (status === 'error') {
    return (
      <div className="checkout-page">
        <CheckoutHero />
        <div className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:px-12">
          <p className="checkout-notice" role="alert">
            Your selection could not be loaded. Return to the cart and try again.
          </p>
          <Link href="/cart" className="checkout-back mt-8 inline-flex">
            ← Back to cart
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'empty') {
    return (
      <div className="checkout-page">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12">
          <CheckoutEmptyState />
        </div>
      </div>
    );
  }

  const clearFieldError = (
    current: ReturnType<typeof createCheckoutPresentation>,
    key: CheckoutFieldKey,
  ) => {
    const errors = { ...current.errors, [key]: undefined };
    const hasErrors = Object.values(errors).some(Boolean);

    return {
      ...current,
      status:
        current.status === 'pending' || (current.status === 'validation-error' && !hasErrors)
          ? 'ready'
          : current.status,
      notice: current.status === 'pending' && current.payment.uiStatus !== 'requires-payment'
        ? null
        : current.notice,
      errors,
    };
  };

  const updateContact = (name: 'email' | 'phone', value: string) => {
    setCheckout((current) => ({
      ...clearFieldError(current, name),
      values: { ...current.values, [name]: value },
    }));
  };

  const updateShipping = (field: keyof CheckoutAddress, value: string) => {
    setCheckout((current) => ({
      ...clearFieldError(current, `shipping.${field}`),
      values: {
        ...current.values,
        shipping: { ...current.values.shipping, [field]: value },
      },
    }));
  };

  const updateBilling = (field: keyof CheckoutAddress, value: string) => {
    setCheckout((current) => ({
      ...clearFieldError(current, `billing.${field}`),
      values: {
        ...current.values,
        billing: { ...current.values.billing, [field]: value },
      },
    }));
  };

  const toggleBilling = (checked: boolean) => {
    setCheckout((current) => ({
      ...current,
      values: { ...current.values, billingSameAsShipping: checked },
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current || isPaymentActionLocked(checkout.payment.uiStatus)) {
      return;
    }

    const errors = validateCheckoutForm(checkout.values);
    if (firstErrorMessage(errors)) {
      setCheckout((current) => ({
        ...current,
        status: 'validation-error',
        sessionStatus: current.session ? current.sessionStatus : 'idle',
        errors,
        notice: null,
      }));
      return;
    }

    if (!canCreateServerCheckout(cart)) {
      setCheckout((current) => ({
        ...current,
        status: 'pending',
        sessionStatus: 'idle',
        errors: {},
        notice: LOCAL_PREVIEW_CHECKOUT_MESSAGE,
      }));
      return;
    }

    submittingRef.current = true;
    checkoutIdempotencyKeyRef.current ??= crypto.randomUUID();
    paymentIdempotencyKeyRef.current ??= crypto.randomUUID();

    setCheckout((current) => ({
      ...current,
      status: 'ready',
      sessionStatus: current.session ? current.sessionStatus : 'creating',
      payment: current.payment.intent
        ? current.payment
        : { ...current.payment, uiStatus: 'creating' },
      errors: {},
      notice: null,
    }));

    try {
      let session = checkout.session;
      if (!session) {
        session = await createCheckoutSession(
          toCheckoutCreateInput(checkout.values, cart.currencyCode),
          {
            cartToken: getGuestToken(),
            idempotencyKey: checkoutIdempotencyKeyRef.current,
          },
        );
      } else {
        session = await getCheckoutSession(session.id, {
          cartToken: getGuestToken(),
          country: checkout.values.shipping.country || undefined,
        });
      }

      if (!isCheckoutReadyForPayment(session)) {
        const shippingAddress = toCheckoutGuestAddress(
          checkout.values.shipping,
          checkout.values.phone,
        );
        const billingAddress = checkout.values.billingSameAsShipping
          ? null
          : toCheckoutGuestAddress(checkout.values.billing, checkout.values.phone);

        if (!shippingAddress) {
          setCheckout((current) => ({
            ...current,
            status: 'ready',
            sessionStatus: 'created',
            session,
            payment: { ...current.payment, uiStatus: 'error' },
            notice: 'A complete shipping address is required before payment.',
          }));
          return;
        }

        session = await patchCheckoutSession(
          session.id,
          {
            shippingAddress,
            billingAddress,
            shippingMethodId: firstShippingMethodId(session) ?? undefined,
          },
          { cartToken: getGuestToken() },
        );

        if (!session.shippingMethodId) {
          const methodId = firstShippingMethodId(session);
          if (!methodId) {
            setCheckout((current) => ({
              ...current,
              status: 'ready',
              sessionStatus: 'created',
              session,
              payment: { ...current.payment, uiStatus: 'error' },
              notice: SHIPPING_UNAVAILABLE_MESSAGE,
            }));
            return;
          }

          session = await patchCheckoutSession(
            session.id,
            { shippingMethodId: methodId },
            { cartToken: getGuestToken() },
          );
        }

        session = await completeCheckoutSession(session.id, {
          cartToken: getGuestToken(),
        });
      }

      if (!isCheckoutReadyForPayment(session) && !session.paymentReady) {
        setCheckout((current) => ({
          ...current,
          status: 'ready',
          sessionStatus: 'created',
          session,
          payment: { ...current.payment, uiStatus: 'error' },
          notice: 'Checkout is not ready for payment.',
        }));
        return;
      }

      const created = await createPaymentIntent(
        { checkoutSessionId: session.id },
        {
          cartToken: getGuestToken(),
          idempotencyKey: paymentIdempotencyKeyRef.current,
        },
      );
      const intent = await getPaymentIntent(created.id, {
        cartToken: getGuestToken(),
      });
      const payment = paymentFromIntent(intent);

      setCheckout((current) => ({
        ...current,
        status: 'ready',
        sessionStatus: 'created',
        session,
        payment,
        notice:
          payment.uiStatus === 'requires-payment'
            ? `${PAYMENT_READY_TITLE}. ${paymentReadyCopy(intent)}`
            : `Payment status is ${intent.status}.`,
      }));
    } catch (error) {
      const notice = shouldUsePaymentError(error)
        ? messageForPaymentError(error)
        : messageForCheckoutError(error);

      setCheckout((current) => ({
        ...current,
        status: 'ready',
        sessionStatus: current.session ? 'created' : 'error',
        payment: {
          ...current.payment,
          uiStatus: 'error',
        },
        notice,
      }));
    } finally {
      submittingRef.current = false;
    }
  };

  const paymentReady = checkout.payment.uiStatus === 'requires-payment';
  const showErrorNotice =
    (checkout.sessionStatus === 'error' || checkout.payment.uiStatus === 'error') &&
    checkout.notice;

  return (
    <div className="checkout-page">
      <CheckoutHero />

      <div className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:px-12">
        {cart.source === 'presentation' ? (
          <p className="checkout-preview-note" role="status">
            Your current selection is a local preview and is not yet available
            to the server checkout.
          </p>
        ) : null}

        <Link href="/cart" className="checkout-back">
          ← Back to cart
        </Link>

        <div className="checkout-layout">
          <motion.div
            id={formId}
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            {status === 'validation-error' ? (
              <p className="checkout-notice checkout-notice--error" role="alert">
                Please review the highlighted fields before continuing.
              </p>
            ) : null}
            {paymentReady ? (
              <p className="checkout-notice" role="status">
                {PAYMENT_READY_TITLE}.{' '}
                {checkout.payment.intent
                  ? paymentReadyCopy(checkout.payment.intent)
                  : checkout.notice}
              </p>
            ) : null}
            {showErrorNotice ? (
              <p className="checkout-notice checkout-notice--error" role="alert">
                {checkout.notice}
              </p>
            ) : null}
            <CheckoutForm
              values={checkout.values}
              errors={checkout.errors}
              notice={
                paymentReady || checkout.sessionStatus === 'error' || checkout.payment.uiStatus === 'error'
                  ? null
                  : checkout.notice
              }
              sessionStatus={checkout.sessionStatus}
              payment={checkout.payment}
              onContactChange={updateContact}
              onShippingChange={updateShipping}
              onBillingChange={updateBilling}
              onBillingToggle={toggleBilling}
              onSubmit={handleSubmit}
            />
          </motion.div>

          <CheckoutOrderSummary cart={cart} session={checkout.session} />
        </div>
      </div>
    </div>
  );
}

function shouldUsePaymentError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const status = 'status' in error ? Number((error as { status?: unknown }).status) : 0;
  const code = 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';

  return (
    status === 503 ||
    status === 403 ||
    code === 'PAYMENT_PROVIDER_NOT_CONFIGURED' ||
    /payment/i.test(error.message)
  );
}

function CheckoutHero() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="mx-auto max-w-7xl px-5 pt-12 pb-8 sm:px-8 sm:pt-16 sm:pb-10 lg:px-12">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-[#8B6914]">
          Checkout
        </p>
        <h1 className="mt-3 font-sans text-[clamp(32px,6vw,64px)] font-light tracking-[-0.045em] leading-[0.98] uppercase text-[#1A1815]">
          Complete your order.
        </h1>
        <p className="mt-5 max-w-xl text-[15px] sm:text-base font-light leading-relaxed text-[#1A1815]/68">
          Review your selection and enter your details to continue.
        </p>
      </motion.div>
    </div>
  );
}
