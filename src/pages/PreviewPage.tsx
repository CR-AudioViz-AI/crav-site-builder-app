import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { BlockRenderer } from '../components/website/BlockRenderer';
import { AIBuilderPanel } from '../components/website/AIBuilderPanel';
import { VersionBar } from '../components/website/VersionBar';
import type { WebBlock } from '../types/website';
import { Upload, Download, Globe } from 'lucide-react';

interface Page {
  id: string;
  slug: string;
  title: string;
  blocks: WebBlock[];
}

interface Site {
  id: string;
  org_id: string;
  title?: string;
  theme?: Record<string, unknown>;
}

export function PreviewPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const [site, setSite] = useState<Site | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAIBuilder, setShowAIBuilder] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

  const selectedPage = pages.find((p) => p.id === selectedPageId) || pages[0];

  useEffect(() => {
    loadSiteData();
  }, [siteId]);

  async function loadSiteData() {
    if (!siteId) return;

    try {
      setLoading(true);
      setError(null);

      const { data: siteData, error: siteError } = await supabase
        .from('sites')
        .select('*')
        .eq('id', siteId)
        .maybeSingle();

      if (siteError) throw siteError;
      if (!siteData) throw new Error('Site not found');

      setSite(siteData);

      const { data: pagesData, error: pagesError } = await supabase
        .from('pages')
        .select('*')
        .eq('site_id', siteId)
        .order('created_at', { ascending: true });

      if (pagesError) throw pagesError;

      setPages(pagesData || []);
      if (pagesData && pagesData.length > 0) {
        setSelectedPageId(pagesData[0].id);
      }
    } catch (err: unknown) {
      console.error('Failed to load site:', err);
      setError(err instanceof Error ? err.message : 'Failed to load site');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading site...</p>
        </div>
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-gray-600">{error || 'Site not found'}</p>
          <a href="/" className="mt-4 inline-block text-blue-600 hover:underline">
            Return home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">{site.title || 'Untitled Site'}</h2>
          <p className="text-sm text-gray-500 truncate">{site.id}</p>
        </div>

        <nav className="p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Pages
          </h3>
          {pages.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No pages yet</p>
          ) : (
            <ul className="space-y-1">
              {pages.map((page) => (
                <li key={page.id}>
                  <button
                    onClick={() => setSelectedPageId(page.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedPageId === page.id
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {page.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
          <VersionBar siteId={siteId!} currentVersion={site.version} onVersionChange={loadSiteData} />
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md cursor-pointer">
              <Upload className="w-4 h-4" />
              Upload Logo
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </label>
            <button
              onClick={() => setShowAIBuilder(!showAIBuilder)}
              className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              AI Builder
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Exporting...' : 'Export'}
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50"
            >
              <Globe className="w-4 h-4" />
              {publishing ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {selectedPage ? (
            <div className="max-w-7xl mx-auto">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">
                {selectedPage.title}
              </h1>
              <div className="space-y-6">
                {selectedPage.blocks && selectedPage.blocks.length > 0 ? (
                  selectedPage.blocks.map((block, idx) => (
                    <BlockRenderer key={`${selectedPage.id}-${idx}`} block={block} />
                  ))
                ) : (
                  <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <p className="text-gray-500">No content blocks yet</p>
                  </div>
                )}
              </div>
              <footer className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
                © {new Date().getFullYear()} {site.title || 'Company'}. All rights reserved.
              </footer>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">Select a page to preview</p>
            </div>
          )}
        </div>
      </div>

      {showAIBuilder && (
        <div className="fixed right-0 top-0 bottom-0 w-96 bg-white border-l border-gray-200 shadow-xl z-40 overflow-y-auto">
          <AIBuilderPanel
            siteId={siteId!}
            onClose={() => setShowAIBuilder(false)}
            onApplied={loadSiteData}
          />
        </div>
      )}

      {publishedUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setPublishedUrl(null)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Site Published!</h3>
            <div className="bg-gray-50 p-3 rounded border border-gray-200 mb-4">
              <a href={publishedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                {publishedUrl}
              </a>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(publishedUrl)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md"
              >
                Copy URL
              </button>
              <button
                onClick={() => window.open(publishedUrl, '_blank')}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              >
                Open Site
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !siteId) return;

    try {
      const uploadRes = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileType: file.type, siteId }),
      });

      if (!uploadRes.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl, publicUrl } = await uploadRes.json();

      await fetch(uploadUrl, { method: 'PUT', body: file });

      const aiRes = await fetch('/api/ai/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          action: 'palette',
          params: { logoUrl: publicUrl },
          orgId: site?.org_id,
        }),
      });

      if (aiRes.ok) {
        loadSiteData();
      }
    } catch (error) {
      console.error('Logo upload failed:', error);
    }
  }

  async function handlePublish() {
    if (!siteId || publishing) return;
    setPublishing(true);
    try {
      const response = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, orgId: site?.org_id }),
      });

      if (!response.ok) throw new Error('Publish failed');
      const result = await response.json();
      setPublishedUrl(result.data.url);
    } catch (error) {
      console.error('Publish failed:', error);
      alert('Failed to publish site');
    } finally {
      setPublishing(false);
    }
  }

  async function handleExport() {
    if (!siteId || exporting) return;
    setExporting(true);
    try {
      const response = await fetch(`/api/export?siteId=${siteId}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `site-${siteId}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export site');
    } finally {
      setExporting(false);
    }
  }
}
