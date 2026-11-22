import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { OrdersAPI, APIOrder, CoursesAPI, APICreateOrderResponse } from '../services/api';
import { useAuth } from './AuthContext';
import { loadRazorpayScript, RazorpayOptions } from '../services/razorpay';

export type PurchasableType = 'course' | 'test' | 'resource';

export interface CheckoutItem {
  id: string;
  type: PurchasableType;
  title: string;
  subtitle?: string;
  price: number;
  originalPrice?: number;
}

interface PurchaseContextType {
  orders: APIOrder[];
  isCourseOwned: (courseId: string | number) => boolean;
  isTestOwned: (testId: string | number) => boolean;
  isResourceOwned: (resourceId: string | number) => boolean;
  openCheckout: (item: CheckoutItem) => void;
  closeCheckout: () => void;
  checkoutItem: CheckoutItem | null;
  isCheckoutOpen: boolean;
  startRazorpayPayment: (item: CheckoutItem, callbacks: {
    onSuccess: (order: APIOrder) => void;
    onError: (errorMsg: string) => void;
    onDismiss?: () => void;
  }) => Promise<void>;
  refreshOrders: () => Promise<void>;
}

const PurchaseContext = createContext<PurchaseContextType | undefined>(undefined);

export const PurchaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [orders, setOrders] = useState<APIOrder[]>([]);
  const [checkoutItem, setCheckoutItem] = useState<CheckoutItem | null>(null);

  const refreshOrders = useCallback(async () => {
    if (!isAuthenticated) {
      setOrders([]);
      return;
    }
    try {
      const data = await OrdersAPI.myOrders();
      setOrders(data);
    } catch (err) {
      console.error('Failed to refresh user orders', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshOrders();
  }, [refreshOrders]);

  const isCourseOwned = useCallback(
    (courseId: string | number) => {
      if (!user) return false;
      if (user?.enrolledCourseIds?.includes(Number(courseId))) return true;
      return orders.some(
        o => o.item_type === 'course' &&
        String(o.item_id) === String(courseId) &&
        o.status === 'paid' && o.entitlement_granted
      );
    },
    [orders, user]
  );

  const isTestOwned = useCallback(
    (testId: string | number) => {
      if (!user) return false;
      return orders.some(
        o => o.item_type === 'test' &&
        String(o.item_id) === String(testId) &&
        o.status === 'paid' && o.entitlement_granted
      );
    },
    [orders, user]
  );

  const isResourceOwned = useCallback(
    (resourceId: string | number) => {
      if (!user) return false;
      return orders.some(
        o => o.item_type === 'resource' &&
        String(o.item_id) === String(resourceId) &&
        o.status === 'paid' && o.entitlement_granted
      );
    },
    [orders, user]
  );

  const openCheckout = useCallback((item: CheckoutItem) => {
    setCheckoutItem(item);
  }, []);

  const closeCheckout = useCallback(() => {
    setCheckoutItem(null);
  }, []);

  const startRazorpayPayment = useCallback(async (
    item: CheckoutItem,
    callbacks: {
      onSuccess: (order: APIOrder) => void;
      onError: (errorMsg: string) => void;
      onDismiss?: () => void;
    }
  ) => {
    if (!isAuthenticated) {
      callbacks.onError('Please log in to your student account to proceed with enrollment.');
      return;
    }

    try {
      // Step 1: Create server-side order with authoritative pricing
      const orderRes: APICreateOrderResponse = await OrdersAPI.create(item.type, item.id);
      const { order, razorpay_key_id, razorpay_order_id, amount, is_sandbox, prefill } = orderRes;

      if (!razorpay_key_id || !razorpay_order_id) {
        callbacks.onError('Payment gateway is not currently configured by the institute administration.');
        return;
      }

      // Step 2: Load official Razorpay Checkout SDK
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        callbacks.onError('Failed to load secure Razorpay checkout script. Please check your internet connection.');
        return;
      }

      // Step 3: Open Razorpay Standard Checkout Modal
      const options: RazorpayOptions = {
        key: razorpay_key_id,
        amount: Math.round(amount * 100),
        currency: 'INR',
        name: 'SIMS Raipur',
        description: item.title,
        order_id: razorpay_order_id,
        prefill: {
          name: prefill?.name || user?.name || '',
          email: prefill?.email || user?.email || '',
          contact: prefill?.contact || user?.phone || '',
        },
        theme: {
          color: '#061426',
        },
        modal: {
          ondismiss: () => {
            if (callbacks.onDismiss) callbacks.onDismiss();
          },
        },
        handler: async (response) => {
          try {
            // Step 4: Verify signature cryptographically on Django backend
            const verifyRes = await OrdersAPI.verify({
              order_id: order.order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            await refreshOrders();
            callbacks.onSuccess(verifyRes.order);
          } catch (err: any) {
            callbacks.onError(err.message || 'Payment signature verification failed.');
          }
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (failRes: any) {
        const desc = failRes?.error?.description || 'Transaction declined by bank or user.';
        callbacks.onError(desc);
      });
      rzp.open();
    } catch (err: any) {
      callbacks.onError(err.message || 'Could not initiate secure checkout.');
    }
  }, [isAuthenticated, user, refreshOrders]);

  return (
    <PurchaseContext.Provider value={{
      orders,
      isCourseOwned,
      isTestOwned,
      isResourceOwned,
      openCheckout,
      closeCheckout,
      checkoutItem,
      isCheckoutOpen: !!checkoutItem,
      startRazorpayPayment,
      refreshOrders,
    }}>
      {children}
    </PurchaseContext.Provider>
  );
};

export const usePurchase = () => {
  const ctx = useContext(PurchaseContext);
  if (!ctx) throw new Error('usePurchase must be used inside PurchaseProvider');
  return ctx;
};
