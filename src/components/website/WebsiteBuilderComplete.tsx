import { useState, useEffect } from 'react';
import { Sparkles, Save, Eye, Upload, Settings, Download, List, Globe, CheckCircle, CreditCard } from 'lucide-react';
import { BriefPanel } from './panels/BriefPanel';
import { CanvasPanel } from './panels/CanvasPanel';
import { StructurePanel } from './panels/StructurePanel';
import { I18nPanel } from './panels/I18nPanel';
import { AccessibilityPanel } from './panels/AccessibilityPanel';
import { OutOfCreditsModal } from './OutOfCreditsModal';
import { Brief, Page, WebBlock, DraftResponse, Site } from '../../types/website';
import { supabase, getCurrentOrgId } from '../../lib/supabase';
import { useCredits } from '../../hooks/useCredits';

export function WebsiteBuilder() {
  const [activeTab, setActiveTab] = useState<'brief' | 'structure' | 'canvas' | 'seo' | 'i18n' | 'accessibility' | 'settings'>('brief');
  const [currentSite, setCurrentSite] = useState<Site | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [brief, setBrief] = useState<Brief>({
    businessName: '',
    industry: '',
    offerings: [],
    differentiators: [],
    targetAudience: '',
    tone: 'professional',
    goals: [],
    strictness: 'moderate',
  });
  const [currentPage, setCurrentPage] = useState<Partial<Page> | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [a11yIssues, setA11yIssues] = useState<any[]>([]);
  const [checkingA11y, setCheckingA11y] = useState(false);
  const [showOutOfCreditsModal, setShowOutOfCreditsModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ name: string; credits: number } | null>(null);
  const { balance, loading: creditsLoading, hasEnoughCredits, refresh: refreshCredits } = useCredits();

  const CREDIT_COSTS = {
    draft: 2,
    regenerate: 1,
    publish: 2,
    export: 2,
  };

  useEffect(() => {
    initializeSite();
  }, []);

  useEffect(() => {
    if (currentSite) {
      loadPages();
      if (currentSite.theme) {
        import('../../lib/theme/applyBrandTokens').then(({ injectBrandTokens }) => {
          injectBrandTokens(currentSite.theme as any);
        });
      }
    }
  }, [currentSite]);

  const initializeSite = async () => {
    try {
      const orgId = getCurrentOrgId();
      const { data: existingSites } = await supabase
        .from('sites')
        .select('*')
        .eq('org_id', orgId)
        .limit(1);

      if (existingSites && existingSites.length > 0) {
        setCurrentSite(existingSites[0]);
      } else {
        const { data: newSite } = await supabase
          .from('sites')
          .insert({
            org_id: orgId,
            handle: `site-${Date.now()}`,
            name: 'My Website',
            theme: getDefaultTheme(),
            settings: {},
          })
          .select()
          .single();

        if (newSite) setCurrentSite(newSite);
      }
    } catch (error: unknown) {
      console.error('Error initializing site:', error);
    }
  };

  const loadPages = async () => {
    if (!currentSite) return;

    try {
      const { data } = await supabase
        .from('pages')
        .select('*')
        .eq('site_id', currentSite.id)
        .order('created_at', { ascending: true });

      if (data) {
        setPages(data as Page[]);
        if (data.length > 0 && !selectedPageId) {
          setSelectedPageId(data[0].id);
          setCurrentPage(data[0]);
        }
      }
    } catch (error: unknown) {
      console.error('Error loading pages:', error);
    }
  };

  const handleGeneratePage = async (pageKind: string) => {
    if (!brief.businessName || !brief.industry || !currentSite) {
      console.warn('⚠️ Please fill in business details and ensure site is initialized');
      return;
    }

    // Check credits
    if (!hasEnoughCredits(CREDIT_COSTS.draft)) {
      setPendingAction({ name: 'generate page', credits: CREDIT_COSTS.draft });
      setShowOutOfCreditsModal(true);
      return;
    }

    setGenerating(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const idempotencyKey = `draft-${Date.now()}-${Math.random()}`;

      const response = await fetch(`${supabaseUrl}/functions/v1/website-draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          siteId: currentSite.id,
          page: {
            kind: pageKind,
            path: pageKind === 'home' ? '/' : `/${pageKind}`,
            lang: 'en',
          },
          brief,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate page');

      const data: DraftResponse = await response.json();

      const newPage = {
        path: pageKind === 'home' ? '/' : `/${pageKind}`,
        title: data.seo.title,
        seo: data.seo,
        blocks: data.blocks,
        status: 'draft' as const,
        lang: 'en',
      };

      setCurrentPage(newPage);
      setActiveTab('canvas');
    } catch (error: unknown) {
      console.error('Error generating page:', error);
      console.warn('⚠️ Failed to generate page. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSavePage = async () => {
    if (!currentPage || !currentSite) return;

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
          siteId: currentSite.id,
          path: currentPage.path,
          lang: currentPage.lang || 'en',
          title: currentPage.title,
          seo: currentPage.seo,
          blocks: currentPage.blocks,
          status: currentPage.status || 'draft',
        }),
      });

      if (!response.ok) throw new Error('Failed to save page');

      const result = await response.json();
      if (result.ok && result.page) {
        setCurrentPage(result.page);
        await loadPages();
        console.log('✅ Page saved successfully!');
      }
    } catch (error: unknown) {
      console.error('Error saving page:', error);
      console.warn('⚠️ Failed to save page. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateBlock = async (block: WebBlock, blockIndex: number) => {
    if (!currentPage || !currentPage.blocks || !currentSite) return;

    // Check credits
    if (!hasEnoughCredits(CREDIT_COSTS.regenerate)) {
      setPendingAction({ name: 'regenerate block', credits: CREDIT_COSTS.regenerate });
      setShowOutOfCreditsModal(true);
      return;
    }

    try{
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
          siteId: currentSite.id,
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
    if (!currentSite) return;

    // Check credits
    if (!hasEnoughCredits(CREDIT_COSTS.publish)) {
      setPendingAction({ name: 'publish site', credits: CREDIT_COSTS.publish });
      setShowOutOfCreditsModal(true);
      return;
    }

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
          siteId: currentSite.id,
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
    if (!currentSite) return;

    // Check credits
    if (!hasEnoughCredits(CREDIT_COSTS.export)) {
      setPendingAction({ name: 'export site', credits: CREDIT_COSTS.export });
      setShowOutOfCreditsModal(true);
      return;
    }

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
          siteId: currentSite.id,
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

  const handleSelectPage = (pageId: string) => {
    const page = pages.find(p => p.id === pageId);
    if (page) {
      setSelectedPageId(pageId);
      setCurrentPage(page);
      setActiveTab('canvas');
    }
  };

  const handleRunA11yCheck = () => {
    setCheckingA11y(true);
    setTimeout(() => {
      const mockIssues = [
        { type: 'success' as const, category: 'Color Contrast', message: 'All text meets WCAG AA standards' },
        { type: 'warning' as const, category: 'Alt Text', message: '2 images missing alt attributes', fix: 'Add descriptive alt text to all images' },
        { type: 'success' as const, category: 'Heading Hierarchy', message: 'Proper heading structure (H1 → H2 → H3)' },
        { type: 'error' as const, category: 'Keyboard Navigation', message: 'Some interactive elements not keyboard accessible', fix: 'Add proper tabindex and ARIA labels' },
      ];
      setA11yIssues(mockIssues);
      setCheckingA11y(false);
    }, 1500);
  };

  const handleTranslatePage = async (targetLang: string) => {
    if (!currentPage || !currentSite) return;

    console.log(`Translation to ${targetLang} would cost 2 credits. This feature generates a new page with AI-translated content.`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Website Builder</h1>
            {currentSite && <p className="text-sm text-gray-500">{currentSite.name}</p>}
          </div>
          <div className="flex items-center gap-3">
            {!creditsLoading && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                <CreditCard className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{balance} credits</span>
              </div>
            )}
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
                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  {publishing ? 'Publishing...' : 'Publish (2 cr)'}
                </button>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {exporting ? 'Exporting...' : 'Export (2 cr)'}
                </button>
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
                activeTab === 'brief' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Sparkles className="w-4 h-4 inline mr-2" />
              Brief & Brand
            </button>
            <button
              onClick={() => setActiveTab('structure')}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'structure' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <List className="w-4 h-4 inline mr-2" />
              Structure
            </button>
            <button
              onClick={() => setActiveTab('canvas')}
              disabled={!currentPage}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'canvas' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Eye className="w-4 h-4 inline mr-2" />
              Canvas
            </button>
            <button
              onClick={() => setActiveTab('seo')}
              disabled={!currentPage}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'seo' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              SEO
            </button>
            <button
              onClick={() => setActiveTab('i18n')}
              disabled={!currentPage}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'i18n' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Globe className="w-4 h-4 inline mr-2" />
              Languages
            </button>
            <button
              onClick={() => setActiveTab('accessibility')}
              disabled={!currentPage}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'accessibility' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <CheckCircle className="w-4 h-4 inline mr-2" />
              Accessibility
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'settings' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Settings
            </button>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Generate Page</h3>
            <div className="space-y-2">
              {['home', 'about', 'services', 'pricing', 'faq', 'contact'].map((pageType) => (
                <button
                  key={pageType}
                  onClick={() => handleGeneratePage(pageType)}
                  disabled={generating}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors disabled:opacity-50"
                >
                  <Sparkles className="w-3 h-3 inline mr-2" />
                  {pageType.charAt(0).toUpperCase() + pageType.slice(1)} (2 cr)
                </button>
              ))}
            </div>
          </div>
        </nav>

        <main className="flex-1 p-6">
          {activeTab === 'brief' && <BriefPanel brief={brief} onChange={setBrief} />}
          {activeTab === 'structure' && (
            <StructurePanel
              pages={pages}
              onAddPage={() => console.log('Add new page - would show page type selector')}
              onRemovePage={(id) => console.log(`Remove page ${id}`)}
              onSelectPage={handleSelectPage}
              selectedPageId={selectedPageId || undefined}
            />
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Page Title</label>
                  <input
                    type="text"
                    value={currentPage.seo?.title || ''}
                    onChange={(e) =>
                      setCurrentPage({ ...currentPage, seo: { ...currentPage.seo!, title: e.target.value } })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
                  <textarea
                    rows={3}
                    value={currentPage.seo?.description || ''}
                    onChange={(e) =>
                      setCurrentPage({ ...currentPage, seo: { ...currentPage.seo!, description: e.target.value } })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}
          {activeTab === 'i18n' && currentPage && (
            <I18nPanel
              currentLang={currentPage.lang || 'en'}
              availableLangs={[{ code: 'en', name: 'English' }]}
              onChangeLang={(lang) => setCurrentPage({ ...currentPage, lang })}
              onTranslatePage={handleTranslatePage}
            />
          )}
          {activeTab === 'accessibility' && (
            <AccessibilityPanel
              issues={a11yIssues}
              onRunCheck={handleRunA11yCheck}
              checking={checkingA11y}
            />
          )}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Site Settings</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics</h3>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                    <option value="">None</option>
                    <option value="ga4">Google Analytics 4</option>
                    <option value="plausible">Plausible</option>
                    <option value="umami">Umami</option>
                  </select>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Domain</h3>
                  <input
                    type="text"
                    placeholder="yourdomain.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Forms</h3>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                    <option value="none">No spam protection</option>
                    <option value="hcaptcha">hCaptcha</option>
                    <option value="recaptcha">reCAPTCHA</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          {generating && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-8 max-w-md">
                <div className="flex items-center justify-center mb-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
                <p className="text-center text-gray-700 font-semibold">Generating your page...</p>
                <p className="text-center text-gray-500 text-sm mt-2">
                  This will debit 2 credits from your account
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      <OutOfCreditsModal
        isOpen={showOutOfCreditsModal}
        onClose={() => {
          setShowOutOfCreditsModal(false);
          setPendingAction(null);
        }}
        currentBalance={balance}
        requiredCredits={pendingAction?.credits || 0}
        actionName={pendingAction?.name || ''}
      />
    </div>
  );
}

function getDefaultTheme() {
  return {
    colors: {
      primary: '#3B82F6',
      secondary: '#8B5CF6',
      accent: '#10B981',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      neutral: ['#F9FAFB', '#F3F4F6', '#E5E7EB', '#D1D5DB', '#9CA3AF', '#6B7280', '#4B5563', '#374151', '#1F2937', '#111827'],
    },
    typography: {
      fontFamily: {
        heading: 'Inter, system-ui, sans-serif',
        body: 'Inter, system-ui, sans-serif',
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
      },
      fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
      lineHeight: {
        tight: '1.2',
        normal: '1.5',
        relaxed: '1.75',
      },
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '3rem',
    },
    radius: {
      sm: '0.25rem',
      md: '0.5rem',
      lg: '0.75rem',
      xl: '1rem',
    },
    motion: {
      duration: {
        fast: '150ms',
        base: '300ms',
        slow: '500ms',
      },
      easing: {
        ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
        in: 'cubic-bezier(0.4, 0, 1, 1)',
        out: 'cubic-bezier(0, 0, 0.2, 1)',
      },
    },
  };
}
