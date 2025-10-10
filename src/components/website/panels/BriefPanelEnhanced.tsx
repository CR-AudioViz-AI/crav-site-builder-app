import { Brief } from '../../../types/website';
import { Plus, X, Upload, Check } from 'lucide-react';
import { useState } from 'react';

interface BriefPanelEnhancedProps {
  brief: Brief;
  onChange: (brief: Brief) => void;
}

type AddModalState = {
  isOpen: boolean;
  field: 'offerings' | 'differentiators' | 'goals' | 'pages' | null;
  label: string;
};

const defaultPages = [
  { id: 'home', label: 'Home', recommended: true },
  { id: 'about', label: 'About', recommended: true },
  { id: 'services', label: 'Services', recommended: true },
  { id: 'pricing', label: 'Pricing', recommended: false },
  { id: 'contact', label: 'Contact', recommended: true },
  { id: 'blog', label: 'Blog', recommended: false },
  { id: 'portfolio', label: 'Portfolio', recommended: false },
  { id: 'testimonials', label: 'Testimonials', recommended: false },
  { id: 'faq', label: 'FAQ', recommended: false },
  { id: 'careers', label: 'Careers', recommended: false },
  { id: 'legal', label: 'Legal (Privacy/Terms)', recommended: false },
];

export function BriefPanelEnhanced({ brief, onChange }: BriefPanelEnhancedProps) {
  const [addModal, setAddModal] = useState<AddModalState>({
    isOpen: false,
    field: null,
    label: '',
  });
  const [inputValue, setInputValue] = useState('');

  const openAddModal = (field: 'offerings' | 'differentiators' | 'goals' | 'pages', label: string) => {
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

  const removeItem = (field: 'offerings' | 'differentiators' | 'goals' | 'pages', index: number) => {
    const updated = [...(brief[field] || [])];
    updated.splice(index, 1);
    onChange({ ...brief, [field]: updated });
  };

  const togglePage = (pageId: string) => {
    const pages = brief.pages || [];
    if (pages.includes(pageId)) {
      onChange({ ...brief, pages: pages.filter((p) => p !== pageId) });
    } else {
      onChange({ ...brief, pages: [...pages, pageId] });
    }
  };

  const togglePaymentProvider = (provider: 'stripe' | 'paypal') => {
    const providers = brief.paymentProviders || [];
    if (providers.includes(provider)) {
      onChange({ ...brief, paymentProviders: providers.filter((p) => p !== provider) });
    } else {
      onChange({ ...brief, paymentProviders: [...providers, provider] });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 max-w-4xl overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
      <h2 className="text-xl font-semibold mb-6">Business Brief (90 seconds)</h2>

      <div className="space-y-6">
        {/* Company Basics */}
        <div className="border-b pb-6">
          <h3 className="font-medium text-gray-900 mb-4">Company Basics</h3>
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

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tagline
              </label>
              <input
                type="text"
                value={brief.tagline || ''}
                onChange={(e) => onChange({ ...brief, tagline: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Your business in one line"
              />
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="border-b pb-6">
          <h3 className="font-medium text-gray-900 mb-4">Contact Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={brief.email || ''}
                onChange={(e) => onChange({ ...brief, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="hello@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={brief.phone || ''}
                onChange={(e) => onChange({ ...brief, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                type="text"
                value={brief.address || ''}
                onChange={(e) => onChange({ ...brief, address: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="123 Main St, City, State 12345"
              />
            </div>
          </div>
        </div>

        {/* Logo & Colors */}
        <div className="border-b pb-6">
          <h3 className="font-medium text-gray-900 mb-4">Logo & Colors</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo (optional)
              </label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className="px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors flex items-center gap-2 text-gray-600 hover:text-blue-600"
                >
                  <Upload className="w-4 h-4" />
                  Upload Logo
                </button>
                {brief.logoUrl && (
                  <div className="flex items-center gap-2 text-green-600">
                    <Check className="w-4 h-4" />
                    Logo uploaded
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={brief.colorMode === 'match-logo'}
                  onChange={(e) =>
                    onChange({ ...brief, colorMode: e.target.checked ? 'match-logo' : 'manual' })
                  }
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  Match colors to logo (auto palette + contrast checks)
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Pages */}
        <div className="border-b pb-6">
          <h3 className="font-medium text-gray-900 mb-4">Pages to Include</h3>
          <div className="grid grid-cols-2 gap-3">
            {defaultPages.map((page) => (
              <label
                key={page.id}
                className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={(brief.pages || []).includes(page.id)}
                  onChange={() => togglePage(page.id)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 flex-1">{page.label}</span>
                {page.recommended && (
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                    Recommended
                  </span>
                )}
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => openAddModal('pages', 'Custom Page')}
            className="mt-3 flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Custom Page
          </button>
        </div>

        {/* Offerings */}
        <div className="border-b pb-6">
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

        {/* Target Audience & Tone */}
        <div className="border-b pb-6 grid grid-cols-2 gap-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tone of Voice
            </label>
            <select
              value={brief.tone}
              onChange={(e) => onChange({ ...brief, tone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="casual">Casual</option>
              <option value="formal">Formal</option>
              <option value="playful">Playful</option>
              <option value="bold">Bold</option>
            </select>
          </div>
        </div>

        {/* E-commerce */}
        <div className="border-b pb-6">
          <h3 className="font-medium text-gray-900 mb-4">E-commerce (Optional)</h3>
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={brief.includeEcommerce}
                onChange={(e) => onChange({ ...brief, includeEcommerce: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Include digital product store
              </span>
            </label>

            {brief.includeEcommerce && (
              <div className="ml-6 space-y-3">
                <div className="text-sm text-gray-600">Payment providers:</div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={(brief.paymentProviders || []).includes('stripe')}
                    onChange={() => togglePaymentProvider('stripe')}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Stripe</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={(brief.paymentProviders || []).includes('paypal')}
                    onChange={() => togglePaymentProvider('paypal')}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">PayPal</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Integrations */}
        <div className="border-b pb-6">
          <h3 className="font-medium text-gray-900 mb-4">Integrations (Optional)</h3>
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={brief.includeNewsletter}
                onChange={(e) => onChange({ ...brief, includeNewsletter: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Include newsletter signup
              </span>
            </label>

            {brief.includeNewsletter && (
              <div className="ml-6">
                <select
                  value={brief.newsletterProvider || ''}
                  onChange={(e) =>
                    onChange({ ...brief, newsletterProvider: e.target.value as any })
                  }
                  className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">Select provider</option>
                  <option value="mailchimp">Mailchimp</option>
                  <option value="beehiiv">Beehiiv</option>
                  <option value="resend">Resend</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Google Analytics 4 ID (optional)
              </label>
              <input
                type="text"
                value={brief.analyticsId || ''}
                onChange={(e) => onChange({ ...brief, analyticsId: e.target.value })}
                className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="G-XXXXXXXXXX"
              />
            </div>
          </div>
        </div>

        {/* Goals & Strictness */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Goals
          </label>
          <div className="space-y-2 mb-4">
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

      {/* Add Modal */}
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
                placeholder={`Enter ${addModal.label.toLowerCase()}`}
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
