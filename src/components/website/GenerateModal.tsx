import { useState } from "react";
import { X } from "lucide-react";

interface GenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (brief: any) => void;
  isGenerating?: boolean;
}

export function GenerateModal({
  isOpen,
  onClose,
  onGenerate,
  isGenerating = false,
}: GenerateModalProps) {
  const [useDefaults, setUseDefaults] = useState(true);
  const [brief, setBrief] = useState({
    businessName: "",
    industry: "",
    tone: "friendly",
    cta: "Get Started",
  });

  if (!isOpen) return null;

  const handleGenerate = () => {
    if (useDefaults) {
      onGenerate({});
    } else {
      onGenerate(brief);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Generate Website</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isGenerating}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">Quick Start</p>
            <p>
              Use smart defaults to generate a website instantly, or customize the brief below.
            </p>
          </div>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useDefaults}
              onChange={(e) => setUseDefaults(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
              disabled={isGenerating}
            />
            <span className="text-sm font-medium">Use smart defaults (recommended)</span>
          </label>

          {!useDefaults && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  value={brief.businessName}
                  onChange={(e) => setBrief({ ...brief, businessName: e.target.value })}
                  placeholder="Your Business"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={isGenerating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Industry
                </label>
                <input
                  type="text"
                  value={brief.industry}
                  onChange={(e) => setBrief({ ...brief, industry: e.target.value })}
                  placeholder="Technology"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={isGenerating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tone</label>
                <select
                  value={brief.tone}
                  onChange={(e) => setBrief({ ...brief, tone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={isGenerating}
                >
                  <option value="friendly">Friendly</option>
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="formal">Formal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Call to Action
                </label>
                <input
                  type="text"
                  value={brief.cta}
                  onChange={(e) => setBrief({ ...brief, cta: e.target.value })}
                  placeholder="Get Started"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={isGenerating}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            disabled={isGenerating}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? "Generating..." : "Generate (2 cr)"}
          </button>
        </div>
      </div>
    </div>
  );
}
