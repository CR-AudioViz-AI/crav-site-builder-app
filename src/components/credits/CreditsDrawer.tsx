import { useState, useEffect } from 'react';
import { X, Download, RefreshCw } from 'lucide-react';

interface LedgerEntry {
  id: string;
  created_at: string;
  action: string;
  cost: number;
  status: string;
  waived: boolean;
  internal_bypass: boolean;
  idem_key: string;
}

interface CreditsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreditsDrawer({ isOpen, onClose }: CreditsDrawerProps) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadLedger();
    }
  }, [isOpen]);

  const loadLedger = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (action) params.set('action', action);
      if (from) params.set('from', from);
      if (to) params.set('to', to);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/credits-ledger?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const result = await response.json();
      if (result.ok) {
        setEntries(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    const header = ['created_at', 'action', 'cost', 'status', 'waived', 'internal_bypass', 'idem_key'];
    const lines = [
      header.join(','),
      ...entries.map((r) =>
        header.map((h) => JSON.stringify((r as any)[h] ?? '')).join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credits-ledger-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full md:w-[480px] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Credits & Usage</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b bg-gray-50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              placeholder="From"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="date"
              placeholder="To"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All actions</option>
            <option value="website.draft">website.draft</option>
            <option value="website.rewrite">website.rewrite</option>
            <option value="website.publish">website.publish</option>
            <option value="website.export">website.export</option>
          </select>

          <div className="flex gap-2">
            <button
              onClick={loadLedger}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button
              onClick={exportCsv}
              className="flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>

          <div className="text-xs text-gray-600 bg-white rounded-lg p-3 border border-gray-200">
            <p>
              <span className="font-medium">Legend:</span>{' '}
              <span className="inline-flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-green-700 font-medium">waived</span>
              </span>{' '}
              = auto-refunded due to server error;{' '}
              <span className="inline-flex items-center gap-1 ml-2">
                <span className="inline-block w-2 h-2 bg-purple-500 rounded-full"></span>
                <span className="text-purple-700 font-medium">internal</span>
              </span>{' '}
              = CRAudioVizAI internal (not billed)
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              Loading...
            </div>
          ) : entries.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              No entries found
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">When</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Action</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700">Cost</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-700">Tags</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-3 text-gray-600">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-gray-900">{entry.action.replace(/-/g, '.')}</td>
                    <td className="px-3 py-3 text-right">
                      <span
                        className={`font-medium ${
                          entry.cost === 0 ? 'text-gray-400' : 'text-gray-900'
                        }`}
                      >
                        {entry.cost}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {entry.waived && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                            waived
                          </span>
                        )}
                        {entry.internal_bypass && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                            internal
                          </span>
                        )}
                        {entry.status !== 'ok' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                            {entry.status}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
