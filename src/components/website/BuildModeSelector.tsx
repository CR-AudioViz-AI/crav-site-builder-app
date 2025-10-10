import { Bot, Palette } from 'lucide-react';
import { BuildMode } from '../../types/website';

interface BuildModeSelectorProps {
  onSelect: (mode: BuildMode) => void;
}

export function BuildModeSelector({ onSelect }: BuildModeSelectorProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            How do you want to build your website?
          </h1>
          <p className="text-lg text-gray-600">
            Choose the approach that works best for you
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <button
            onClick={() => onSelect('ai-built')}
            className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 text-left border-2 border-transparent hover:border-blue-500"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-500 transition-colors">
                <Bot className="w-8 h-8 text-blue-600 group-hover:text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">AI-Built</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Tell us what you want, we'll ask follow-up questions, then build it for you.
            </p>
            <ul className="space-y-2 text-sm text-gray-500">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                Chat-first interface
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                Smart follow-up questions
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                Conversational editing
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                Fastest to get started
              </li>
            </ul>
            <div className="mt-6 px-4 py-2 bg-blue-50 rounded-lg text-blue-700 font-medium text-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
              Start Building →
            </div>
          </button>

          <button
            onClick={() => onSelect('custom')}
            className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 text-left border-2 border-transparent hover:border-purple-500"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-500 transition-colors">
                <Palette className="w-8 h-8 text-purple-600 group-hover:text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Custom</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Pick templates, pages, colors, and content manually with AI help on copy and images.
            </p>
            <ul className="space-y-2 text-sm text-gray-500">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                Wizard-style interface
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                Choose from 12 templates
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                Full control over design
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                Visual page builder
              </li>
            </ul>
            <div className="mt-6 px-4 py-2 bg-purple-50 rounded-lg text-purple-700 font-medium text-center group-hover:bg-purple-500 group-hover:text-white transition-colors">
              Choose Template →
            </div>
          </button>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          Don't worry, you can switch between modes anytime
        </div>
      </div>
    </div>
  );
}
