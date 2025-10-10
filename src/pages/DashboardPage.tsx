import { useState, useEffect } from 'react';
import { Check, Clock, Lock, CreditCard } from 'lucide-react';
import { fetchWithCredits } from '../lib/fetchWithCredits';
import { config } from '../lib/config';
import { MyAccessDrawer } from '../components/dashboard/MyAccessDrawer';

interface AppTile {
  id: string;
  name: string;
  description: string;
  status: 'enabled' | 'trial' | 'upgrade';
  icon?: string;
}

export function DashboardPage() {
  const [apps, setApps] = useState<AppTile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAccessDrawer, setShowAccessDrawer] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const response = await fetchWithCredits(
        `${config.supabaseUrl}/functions/v1/dashboard-manifest`,
        { method: 'POST' }
      );

      if (!response.ok) {
        throw new Error('Failed to load dashboard');
      }

      const data = await response.json();
      setApps(data.apps || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'enabled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
            <Check className="w-3 h-3" />
            Enabled
          </span>
        );
      case 'trial':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
            <Clock className="w-3 h-3" />
            Trial
          </span>
        );
      case 'upgrade':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
            <Lock className="w-3 h-3" />
            Upgrade
          </span>
        );
      default:
        return null;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">Manage your apps and services</p>
            </div>
            <button
              onClick={() => setShowAccessDrawer(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              My Access
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        ) : apps.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No apps available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apps.map((app) => (
              <div
                key={app.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">{app.icon || '📦'}</span>
                  </div>
                  {getStatusBadge(app.status)}
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">{app.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{app.description}</p>

                {app.status === 'enabled' && (
                  <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                    Open
                  </button>
                )}

                {app.status === 'trial' && (
                  <button className="w-full px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium transition-colors">
                    Continue Trial
                  </button>
                )}

                {app.status === 'upgrade' && (
                  <button className="w-full px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg font-medium transition-colors">
                    Upgrade to Access
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <MyAccessDrawer
        isOpen={showAccessDrawer}
        onClose={() => setShowAccessDrawer(false)}
      />
    </div>
  );
}
