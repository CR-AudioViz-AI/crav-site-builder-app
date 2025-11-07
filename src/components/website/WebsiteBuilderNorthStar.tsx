import { useState, useEffect } from 'react';
import { BuildMode, Brief, Template, Page } from '../../types/website';
import { BuildModeSelector } from './BuildModeSelector';
import { TemplateSelector } from './TemplateSelector';
import { BriefPanelEnhanced } from './panels/BriefPanelEnhanced';
import { WebsiteBuilder } from './WebsiteBuilder';
import { CreditsBadge } from '../credits/CreditsBadge';
import { CreditsDrawer } from '../credits/CreditsDrawer';

function BrandHeader() {
  const [branding, setBranding] = useState<any>(null);

  useEffect(() => {
    const loadBranding = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(`${supabaseUrl}/functions/v1/branding-get`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        });
        const result = await response.json();
        if (result.ok && result.data) {
          setBranding(result.data);
        }
      } catch (error: unknown) {
        console.error('Failed to load branding:', error);
      }
    };
    loadBranding();
  }, []);

  const logo = branding?.logo_url || 'https://assets.craudioviz.ai/logo.svg';
  const name = branding?.name || 'CRAudioVizAI';

  return (
    <div className="flex items-center gap-2">
      <img src={logo} alt="logo" className="h-6 w-6" />
      <span className="font-semibold">{name}</span>
    </div>
  );
}

type FlowStep = 'mode-select' | 'template-select' | 'brief' | 'builder';

export function WebsiteBuilderNorthStar() {
  const [step, setStep] = useState<FlowStep>('mode-select');
  const [buildMode, setBuildMode] = useState<BuildMode | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [brief, setBrief] = useState<Brief>({
    businessName: '',
    industry: '',
    offerings: [],
    differentiators: [],
    targetAudience: '',
    tone: 'professional',
    goals: [],
    pages: ['home', 'about', 'services', 'contact'],
    strictness: 'moderate',
    colorMode: 'manual',
    includeEcommerce: false,
    paymentProviders: [],
    includeNewsletter: false,
  });

  const handleModeSelect = (mode: BuildMode) => {
    setBuildMode(mode);
    if (mode === 'ai-built') {
      // Skip template selection for AI mode
      setStep('brief');
    } else {
      setStep('template-select');
    }
  };

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    // Pre-fill pages from template
    setBrief({
      ...brief,
      pages: template.defaultPages.map((p) => p.toLowerCase()),
      templateId: template.id,
    });
    setStep('brief');
  };

  const handleStartBuilding = () => {
    // Validate minimum requirements
    if (!brief.businessName || !brief.industry) {
      alert('Please fill in at least Business Name and Industry');
      return;
    }
    setStep('builder');
  };

  if (step === 'mode-select') {
    return <BuildModeSelector onSelect={handleModeSelect} />;
  }

  if (step === 'template-select') {
    return (
      <TemplateSelector
        onSelect={handleTemplateSelect}
        onBack={() => setStep('mode-select')}
      />
    );
  }

  if (step === 'brief') {
    return (
      <>
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <BrandHeader />
                <div className="border-l pl-4">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {buildMode === 'ai-built' ? 'Tell us about your business' : 'Complete your brief'}
                  </h1>
                  <p className="text-gray-600 mt-1">
                    This will only take 90 seconds
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CreditsBadge onOpenDrawer={() => setDrawerOpen(true)} />
                <button
                  onClick={() => setStep(buildMode === 'custom' ? 'template-select' : 'mode-select')}
                  className="text-gray-600 hover:text-gray-900"
                >
                  ← Back
                </button>
              </div>
            </div>

          <BriefPanelEnhanced brief={brief} onChange={setBrief} />

          <div className="mt-6 flex justify-end gap-4">
            <button
              onClick={handleStartBuilding}
              disabled={!brief.businessName || !brief.industry}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Generate Website →
            </button>
          </div>

          {selectedTemplate && (
            <div className="mt-4 text-sm text-gray-500 text-center">
              Using template: <span className="font-medium">{selectedTemplate.name}</span>
            </div>
          )}
        </div>
        </div>
        <CreditsDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </>
    );
  }

  // Builder step - pass everything to the original WebsiteBuilder
  return (
    <>
      <div>
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <BrandHeader />
              <div className="text-sm border-l pl-4">
                <span className="text-gray-600">Building:</span>
                <span className="font-medium text-gray-900 ml-2">{brief.businessName}</span>
                {selectedTemplate && (
                  <span className="ml-4 text-gray-600">
                    Template: <span className="font-medium">{selectedTemplate.name}</span>
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CreditsBadge onOpenDrawer={() => setDrawerOpen(true)} />
              <button
                onClick={() => setStep('brief')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Edit Brief
              </button>
            </div>
          </div>
        </div>
        <WebsiteBuilder initialBrief={brief} template={selectedTemplate || undefined} />
      </div>
      <CreditsDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
