import { useState, useEffect } from 'react';
import { CreditCard } from 'lucide-react';

interface CreditsData {
  credits_remaining: number;
  credits_total: number;
  credits_spent: number;
}

interface CreditsBadgeProps {
  onOpenDrawer: () => void;
}

export function CreditsBadge({ onOpenDrawer }: CreditsBadgeProps) {
  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCredits();
    const interval = setInterval(loadCredits, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const loadCredits = async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/credits-balance`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();
      if (result.ok) {
        setCredits(result.data);
      }
    } catch (error: unknown) {
      console.error('Failed to load credits:', error);
    } finally {
      setLoading(false);
    }
  };

  const remaining = credits?.credits_remaining ?? 0;
  const isLow = remaining < 100;

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        onOpenDrawer();
      }}
      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
      title="View credit usage details"
    >
      <CreditCard size={16} className={isLow ? 'text-orange-500' : 'text-gray-600'} />
      <span className="text-gray-600">Credits</span>
      <span className={`font-semibold ${isLow ? 'text-orange-600' : 'text-gray-900'}`}>
        {loading ? '...' : remaining.toLocaleString()}
      </span>
    </button>
  );
}
