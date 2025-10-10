import { useState, useEffect } from 'react';
import { supabase, getCurrentOrgId } from '../lib/supabase';

export function useCredits() {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const orgId = getCurrentOrgId();
      const { data, error } = await supabase.rpc('get_credit_balance', {
        p_org_id: orgId,
      });

      if (error) {
        console.error('Error fetching credit balance:', error);
        setBalance(0);
      } else {
        setBalance(data || 0);
      }
    } catch (error) {
      console.error('Error fetching credit balance:', error);
      setBalance(0);
    } finally {
      setLoading(false);
    }
  };

  const hasEnoughCredits = (required: number): boolean => {
    return balance >= required;
  };

  const refresh = () => {
    fetchBalance();
  };

  return { balance, loading, hasEnoughCredits, refresh };
}
