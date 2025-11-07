import { useState, useEffect } from 'react';
import { Sparkles, Save, Eye, Upload, Settings, Download } from 'lucide-react';
import { BriefPanel } from './panels/BriefPanel';
import { CanvasPanel } from './panels/CanvasPanel';
import { GenerateModal } from './GenerateModal';
import { BusinessBanner } from './BusinessBanner';
import { OutOfCreditsModal } from './OutOfCreditsModal';
import { Brief, Page, WebBlock, DraftResponse, Template } from '../../types/website';
import { supabase, getCurrentOrgId } from '../../lib/supabase';
import { generateMultiplePages } from '../../lib/generators/pageGenerator';

interface WebsiteBuilderProps {
  initialBrief?: Brief;
  template?: Template;
}

export function WebsiteBuilder({ initialBrief, template }: WebsiteBuilderProps = {}) {
  const [activeTab, setActiveTab] = useState<'brief' | 'canvas' | 'seo' | 'settings'>('brief');
  const [brief, setBrief] = useState<Brief>(initialBrief || {
    businessName: '',
    industry: '',
    offerings: [],
    differentiators: [],
    targetAudience: '',
    tone: 'professional',
    goals: [],
    pages: [],
    strictness: 'moderate',
    colorMode: 'manual',
    includeEcommerce: false,
    paymentProviders: [],
    includeNewsletter: false,
  });
  const [allPages, setAllPages] = useState<Partial<Page>[]>([]);
  const [currentPage, setCurrentPage] = useState<Partial<Page> | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [creditsError, setCreditsError] = useState<any>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Initialize immediately for demo
    setInitialized(true);
  }, []);

  useEffect(() => {
    setHasProfile(!!brief.businessName && !!brief.industry);
  }, [brief]);

  const handleGeneratePage = async (customBrief?: any) => {
    setGenerating(true);
    setShowGenerateModal(false);

    try {
      const finalBrief = customBrief || brief;

      // Generate multiple pages based on brief
      const generatedPages = generateMultiplePages(finalBrief, template);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      setAllPages(generatedPages);
      setCurrentPage(generatedPages[0]);
      setCurrentPageIndex(0);
      setActiveTab('canvas');

      console.log(`✅ Generated ${generatedPages.length} pages successfully!`);
    } catch (error: unknown) {
      console.error('Error generating pages:', error);
      alert('Failed to generate pages. Please check your business information and try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSavePage = async () => {
    if (!currentPage) return;

    setSaving(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/website-save-page`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          siteId: 'demo-site-123',
          path: currentPage.path,
          lang: currentPage.lang || 'en',
          title: currentPage.title,
          seo: currentPage.seo,
          blocks: currentPage.blocks,
          status: currentPage.status || 'draft',
        }),
      });

      if (!response.ok) throw new Error('Failed to save page');
      console.log('✅ Page saved successfully!');
    } catch (error: unknown) {
      console.error('Error saving page:', error);
      console.warn('⚠️ Failed to save page. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateBlock = async (block: WebBlock, blockIndex: number) => {
    if (!currentPage || !currentPage.blocks) return;

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const idempotencyKey = `regenerate-${Date.now()}-${Math.random()}`;

      const response = await fetch(`${supabaseUrl}/functions/v1/website-regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          siteId: 'demo-site-123',
          pageId: currentPage.id || 'temp',
          blockIndex,
          block,
          brief,
        }),
      });

      if (!response.ok) throw new Error('Failed to regenerate block');

      const newBlock = await response.json();
      const updatedBlocks = [...currentPage.blocks];
      updatedBlocks[blockIndex] = newBlock;

      setCurrentPage({
        ...currentPage,
        blocks: updatedBlocks,
      });
    } catch (error: unknown) {
      console.error('Error regenerating block:', error);
      console.warn('⚠️ Failed to regenerate block. Please try again.');
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const idempotencyKey = `publish-${Date.now()}-${Math.random()}`;

      const response = await fetch(`${supabaseUrl}/functions/v1/website-publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          siteId: 'demo-site-123',
          provider: 'static',
          preview: false,
        }),
      });

      if (!response.ok) throw new Error('Failed to publish');

      const result = await response.json();
      console.log(`✅ Published successfully! URL: ${result.url}`);
    } catch (error: unknown) {
      console.error('Error publishing:', error);
      console.warn('⚠️ Failed to publish. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const idempotencyKey = `export-${Date.now()}-${Math.random()}`;

      const response = await fetch(`${supabaseUrl}/functions/v1/website-export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          siteId: 'demo-site-123',
          framework: 'next',
        }),
      });

      if (!response.ok) throw new Error('Failed to export');

      const result = await response.json();
      console.log(`✅ Exported successfully! Download: ${result.url}`);
      window.open(result.url, '_blank');
    } catch (error: unknown) {
      console.error('Error exporting:', error);
      console.warn('⚠️ Failed to export. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Website Builder</h1>
            {allPages.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Page:</span>
                <select
                  value={currentPageIndex}
                  onChange={(e) => {
                    const idx = parseInt(e.target.value);
                    setCurrentPageIndex(idx);
                    setCurrentPage(allPages[idx]);
                  }}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {allPages.map((page, idx) => (
                    <option key={idx} value={idx}>
                      {page.title || page.path}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-gray-400">
                  {currentPageIndex + 1} of {allPages.length}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {currentPage && (
              <>
                <button
                  onClick={handleSavePage}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePublish}
                    disabled={publishing}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    {publishing ? 'Publishing...' : 'Publish'}
                  </button>
                  <span className="text-xs text-gray-500">Free</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    {exporting ? 'Exporting...' : 'Export'}
                  </button>
                  <span className="text-xs text-gray-500">Free</span>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex">
        <nav className="w-64 bg-white border-r border-gray-200 min-h-screen p-4">
          <div className="space-y-2">
            <button
              onClick={() => setActiveTab('brief')}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'brief'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Sparkles className="w-4 h-4 inline mr-2" />
              Brief & Brand
            </button>
            <button
              onClick={() => setActiveTab('canvas')}
              disabled={!currentPage}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'canvas'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Eye className="w-4 h-4 inline mr-2" />
              Canvas
            </button>
            <button
              onClick={() => setActiveTab('seo')}
              disabled={!currentPage}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'seo'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              SEO
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'settings'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Settings
            </button>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => setShowGenerateModal(true)}
                disabled={generating || !initialized}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                {generating ? 'Generating...' : 'Generate Website'}
              </button>
              <p className="text-xs text-gray-500 text-center">Cost: <span className="font-semibold">2 credits</span></p>
            </div>
          </div>
        </nav>

        <main className="flex-1 p-6">
          <BusinessBanner hasProfile={hasProfile} />

          {activeTab === 'brief' && (
            <BriefPanel brief={brief} onChange={setBrief} />
          )}
          {activeTab === 'canvas' && currentPage && (
            <CanvasPanel
              page={currentPage}
              onRegenerateBlock={(block) => {
                const index = currentPage.blocks?.indexOf(block) ?? -1;
                if (index >= 0) handleRegenerateBlock(block, index);
              }}
            />
          )}
          {activeTab === 'seo' && currentPage && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">SEO Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Page Title
                  </label>
                  <input
                    type="text"
                    value={currentPage.seo?.title || ''}
                    onChange={(e) =>
                      setCurrentPage({
                        ...currentPage,
                        seo: { ...currentPage.seo!, title: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meta Description
                  </label>
                  <textarea
                    rows={3}
                    value={currentPage.seo?.description || ''}
                    onChange={(e) =>
                      setCurrentPage({
                        ...currentPage,
                        seo: { ...currentPage.seo!, description: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Site Settings</h2>
              <p className="text-gray-600">Configure analytics, domains, and more...</p>
            </div>
          )}
          {generating && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-8 max-w-md">
                <div className="flex items-center justify-center mb-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
                <p className="text-center text-gray-700 font-semibold">
                  Generating your page...
                </p>
                <p className="text-center text-gray-500 text-sm mt-2">
                  This will debit 2 credits from your account
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      <GenerateModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerate={handleGeneratePage}
        isGenerating={generating}
      />

      {showCreditsModal && creditsError && (
        <OutOfCreditsModal
          isOpen={showCreditsModal}
          onClose={() => setShowCreditsModal(false)}
          balance={creditsError.balance}
          required={creditsError.required}
        />
      )}
    </div>
  );
}
