import { Brief } from '../../../types/website';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';

interface BriefPanelProps {
  brief: Brief;
  onChange: (brief: Brief) => void;
}

type AddModalState = {
  isOpen: boolean;
  field: 'offerings' | 'differentiators' | 'goals' | null;
  label: string;
};

export function BriefPanel({ brief, onChange }: BriefPanelProps) {
  const [addModal, setAddModal] = useState<AddModalState>({
    isOpen: false,
    field: null,
    label: '',
  });
  const [inputValue, setInputValue] = useState('');

  const openAddModal = (field: 'offerings' | 'differentiators' | 'goals', label: string) => {
    setAddModal({ isOpen: true, field, label });
    setInputValue('');
  };

  const closeAddModal = () => {
    setAddModal({ isOpen: false, field: null, label: '' });
    setInputValue('');
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addModal.field || !inputValue.trim()) return;

    onChange({
      ...brief,
      [addModal.field]: [...(brief[addModal.field] || []), inputValue.trim()],
    });
    closeAddModal();
  };

  const removeItem = (field: 'offerings' | 'differentiators' | 'goals', index: number) => {
    const updated = [...(brief[field] || [])];
    updated.splice(index, 1);
    onChange({ ...brief, [field]: updated });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 max-w-4xl">
      <h2 className="text-xl font-semibold mb-6">Business Brief & Brand</h2>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Name *
            </label>
            <input
              type="text"
              value={brief.businessName}
              onChange={(e) => onChange({ ...brief, businessName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Acme Corp"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Industry *
            </label>
            <input
              type="text"
              value={brief.industry}
              onChange={(e) => onChange({ ...brief, industry: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="SaaS, E-commerce, etc."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Target Audience
          </label>
          <input
            type="text"
            value={brief.targetAudience}
            onChange={(e) => onChange({ ...brief, targetAudience: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Small businesses, developers, etc."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Products/Services
          </label>
          <div className="space-y-2">
            {brief.offerings?.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={item}
                  readOnly
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
                <button
                  type="button"
                  onClick={() => removeItem('offerings', idx)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => openAddModal('offerings', 'Product/Service')}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Product/Service
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Key Differentiators
          </label>
          <div className="space-y-2">
            {brief.differentiators?.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={item}
                  readOnly
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
                <button
                  type="button"
                  onClick={() => removeItem('differentiators', idx)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => openAddModal('differentiators', 'Differentiator')}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Differentiator
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Goals
          </label>
          <div className="space-y-2">
            {brief.goals?.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={item}
                  readOnly
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
                <button
                  type="button"
                  onClick={() => removeItem('goals', idx)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => openAddModal('goals', 'Goal')}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Goal
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tone
            </label>
            <select
              value={brief.tone}
              onChange={(e) => onChange({ ...brief, tone: e.target.value as Brief['tone'] })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="casual">Casual</option>
              <option value="formal">Formal</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Brand Guidelines Strictness
            </label>
            <select
              value={brief.strictness}
              onChange={(e) => onChange({ ...brief, strictness: e.target.value as Brief['strictness'] })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="loose">Loose - More creative freedom</option>
              <option value="moderate">Moderate - Balanced approach</option>
              <option value="strict">Strict - Follow guidelines closely</option>
            </select>
          </div>
        </div>
      </div>

      {addModal.isOpen && (
        <div className="fixed inset-0 grid place-items-center bg-black/30 z-50">
          <div className="bg-white p-6 rounded-xl w-[440px] shadow-xl">
            <h2 className="text-lg font-semibold mb-4">Add {addModal.label}</h2>
            <form onSubmit={handleAddItem}>
              <input
                autoFocus
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={`e.g., ${
                  addModal.field === 'offerings'
                    ? 'Audio Cleanup Pro'
                    : addModal.field === 'differentiators'
                    ? 'AI-powered technology'
                    : 'Increase brand awareness'
                }`}
              />
              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!inputValue.trim()}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
