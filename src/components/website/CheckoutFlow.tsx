import { useState } from 'react';
import { CreditCard, DollarSign } from 'lucide-react';
import { trackCheckout } from '../../lib/telemetry';

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
}

interface CheckoutFlowProps {
  product: Product;
  onSuccess: () => void;
}

export default function CheckoutFlow({ product, onSuccess }: CheckoutFlowProps) {
  const [provider, setProvider] = useState<'stripe' | 'paypal'>('stripe');
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);
    try {
      trackCheckout('demo-org', product.id, provider);

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          provider,
          successUrl: window.location.origin + '/success',
          cancelUrl: window.location.origin + '/cancel',
        }),
      });

      const data = await response.json();

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 border border-neutral-800 rounded-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{product.name}</h2>
        <p className="text-neutral-400 text-sm mt-1">{product.description}</p>
        <div className="text-3xl font-bold mt-4">${product.price}</div>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-medium">Select Payment Method</div>
        <div className="space-y-2">
          <button
            onClick={() => setProvider('stripe')}
            className={`w-full flex items-center justify-between p-3 rounded-lg border ${
              provider === 'stripe'
                ? 'border-blue-600 bg-blue-600/10'
                : 'border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              <span>Stripe</span>
            </div>
            {provider === 'stripe' && (
              <div className="w-2 h-2 rounded-full bg-blue-600" />
            )}
          </button>

          <button
            onClick={() => setProvider('paypal')}
            className={`w-full flex items-center justify-between p-3 rounded-lg border ${
              provider === 'paypal'
                ? 'border-blue-600 bg-blue-600/10'
                : 'border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              <span>PayPal</span>
            </div>
            {provider === 'paypal' && (
              <div className="w-2 h-2 rounded-full bg-blue-600" />
            )}
          </button>
        </div>
      </div>

      <button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium"
      >
        {loading ? 'Processing...' : 'Proceed to Checkout'}
      </button>

      <div className="text-xs text-neutral-500 text-center">
        Secure checkout powered by {provider === 'stripe' ? 'Stripe' : 'PayPal'}
      </div>
    </div>
  );
}
