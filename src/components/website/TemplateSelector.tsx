import { useState } from 'react';
import { Check } from 'lucide-react';
import { Template } from '../../types/website';
import { templates } from '../../data/templates';

interface TemplateSelectorProps {
  onSelect: (template: Template) => void;
  onBack?: () => void;
}

const categories = [
  { id: 'all', name: 'All Templates' },
  { id: 'business', name: 'Business' },
  { id: 'saas', name: 'SaaS' },
  { id: 'creative', name: 'Creative' },
  { id: 'ecommerce', name: 'E-commerce' },
  { id: 'content', name: 'Content' },
  { id: 'personal', name: 'Personal' },
];

export function TemplateSelector({ onSelect, onBack }: TemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const filteredTemplates =
    selectedCategory === 'all'
      ? templates
      : templates.filter((t) => t.category === selectedCategory);

  const handleSelect = (template: Template) => {
    setSelectedTemplate(template.id);
    setTimeout(() => onSelect(template), 300);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Choose Your Template</h1>
              <p className="text-gray-600 mt-2">
                Select a template to get started. You can customize everything later.
              </p>
            </div>
            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Back
              </button>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => handleSelect(template)}
              className={`group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 text-left border-2 ${
                selectedTemplate === template.id
                  ? 'border-blue-500 scale-105'
                  : 'border-transparent'
              }`}
            >
              <div
                className="h-48 relative"
                style={{
                  background: `linear-gradient(135deg, ${template.defaultTheme.colors?.primary || '#2563eb'}, ${template.defaultTheme.colors?.secondary || '#7c3aed'})`,
                }}
              >
                {selectedTemplate === template.id && (
                  <div className="absolute top-4 right-4 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <Check className="w-5 h-5 text-blue-600" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                  <div className="text-white text-sm font-medium">
                    {template.defaultPages.join(' • ')}
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-lg text-gray-900 mb-1">
                  {template.name}
                </h3>
                <p className="text-sm text-gray-600">{template.description}</p>
                <div className="mt-3 flex gap-2">
                  {template.defaultTheme.colors && (
                    <div className="flex gap-1">
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: template.defaultTheme.colors.primary }}
                      />
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: template.defaultTheme.colors.secondary }}
                      />
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: template.defaultTheme.colors.accent }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No templates found in this category
          </div>
        )}
      </div>
    </div>
  );
}
