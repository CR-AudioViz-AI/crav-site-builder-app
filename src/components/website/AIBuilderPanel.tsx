import { useState } from 'react';
import { Wand2, Palette, Layout, Type, ShoppingBag, X } from 'lucide-react';
import { trackAIApply } from '../../lib/telemetry';

interface AIBuilderPanelProps {
  siteId: string;
  onClose: () => void;
  onApplied: () => void;
}

export function AIBuilderPanel({ siteId, onClose, onApplied }: AIBuilderPanelProps) {
  const [customPrompt, setCustomPrompt] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [loading, setLoading] = useState(false);

  const presets = [
    { id: 'palette', label: 'Change Palette', icon: Palette, message: 'Match logo colors & keep WCAG AA contrast.' },
    { id: 'template', label: 'Swap Template', icon: Layout, message: 'Switch to a different template without losing content.' },
    { id: 'section', label: 'Add Section', icon: Type, message: 'Add a hero section near bottom with sample content.' },
    { id: 'copy', label: 'Rewrite Copy', icon: Type, message: 'Rewrite current page copy friendlier, ~20% shorter.' },
    { id: 'product', label: 'Add Product', icon: ShoppingBag, message: 'Create product and add to store.' },
  ];

  async function handlePreset(preset: typeof presets[0]) {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          action: preset.id,
          params: { message: preset.message },
          orgId: 'demo-org',
        }),
      });

      if (!response.ok) throw new Error('AI apply failed');

      trackAIApply('demo-org', siteId, preset.id);
      onApplied();
    } catch (error) {
      console.error('AI apply error:', error);
      alert('Failed to apply AI action');
    } finally {
      setLoading(false);
    }
  }

  async function handleCustom() {
    if (!customPrompt.trim()) return;
    setLoading(true);
    try {
      const response = await fetch('/api/ai/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          action: 'custom',
          params: { message: customPrompt },
          orgId: 'demo-org',
        }),
      });

      if (!response.ok) throw new Error('AI apply failed');

      trackAIApply('demo-org', siteId, 'custom', { prompt: customPrompt });
      setCustomPrompt('');
      onApplied();
    } catch (error) {
      console.error('AI apply error:', error);
      alert('Failed to apply custom action');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full bg-white flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-semibold flex items-center gap-2 text-gray-900">
          <Wand2 className="w-5 h-5" />
          AI Builder
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 text-gray-500"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Actions</h4>
          <div className="space-y-2">
            {presets.map((preset) => {
              const Icon = preset.icon;
              return (
                <button
                  key={preset.id}
                  onClick={() => handlePreset(preset)}
                  disabled={loading}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-sm text-left"
                >
                  <Icon className="w-5 h-5 text-gray-600 flex-shrink-0" />
                  <span className="text-gray-900">{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Custom Instruction</h4>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Describe what you want to change..."
            className="w-full h-24 bg-white border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleCustom}
            disabled={loading || !customPrompt.trim()}
            className="w-full mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white"
          >
            {loading ? 'Applying...' : 'Apply Custom Change'}
          </button>
        </div>
      </div>
    </div>
  );
}
