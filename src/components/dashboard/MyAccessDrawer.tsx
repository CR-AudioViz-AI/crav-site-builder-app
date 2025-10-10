import { useState, useEffect } from 'react';
import { X, CreditCard, Users, Zap } from 'lucide-react';
import { CreditsBadge } from '../credits/CreditsBadge';
import { fetchWithCredits } from '../../lib/fetchWithCredits';
import { config } from '../../lib/config';

interface MyAccessDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AccessInfo {
  plan: string;
  credits: number;
  enabledApps: string[];
  role: string;
}

export function MyAccessDrawer({ isOpen, onClose }: MyAccessDrawerProps) {
  const [accessInfo, setAccessInfo] = useState<AccessInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadAccessInfo();
    }
  }, [isOpen]);

  async function loadAccessInfo() {
    try {
      setLoading(true);

      const [creditsRes] = await Promise.all([
        fetchWithCredits(`${config.supabaseUrl}/functions/v1/credits-balance`, {
          method: 'POST',
        }),
      ]);

      if (creditsRes.ok) {
        const creditsData = await creditsRes.json();
        setAccessInfo({
          plan: 'Professional',
          credits: creditsData.balance || 0,
          enabledApps: ['CRAudioVizAI Website Builder'],
          role: 'Owner',
        });
      }
    } catch (err) {
      console.error('Failed to load access info:', err);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-xl z-50 overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">My Access</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : accessInfo ? (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Current Plan</h3>
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span className="text-lg font-semibold text-gray-900">{accessInfo.plan}</span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Credits Balance</h3>
              <CreditsBadge />
              <button className="mt-2 text-sm text-blue-600 hover:underline">
                Top up credits
              </button>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Role</h3>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900">{accessInfo.role}</span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3">Enabled Apps</h3>
              {accessInfo.enabledApps.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No apps enabled</p>
              ) : (
                <ul className="space-y-2">
                  {accessInfo.enabledApps.map((app) => (
                    <li
                      key={app}
                      className="flex items-center gap-2 p-2 bg-green-50 rounded-lg"
                    >
                      <Zap className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-gray-900">{app}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="pt-4 border-t border-gray-200">
              <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                Manage Subscription
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            Failed to load access information
          </div>
        )}
      </div>
    </>
  );
}
