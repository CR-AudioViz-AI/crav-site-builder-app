import { Page, WebBlock } from '../../../types/website';
import { BlockRenderer } from '../BlockRenderer';

interface CanvasPanelProps {
  page: Partial<Page>;
  onRegenerateBlock: (block: WebBlock) => void;
}

export function CanvasPanel({ page, onRegenerateBlock }: CanvasPanelProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4">{page.title || 'Untitled Page'}</h2>
      <div className="space-y-4">
        {page.blocks?.map((block, index) => (
          <BlockRenderer key={index} block={block} onRegenerate={onRegenerateBlock} />
        ))}
        {!page.blocks?.length && (
          <p className="text-gray-500 text-center py-8">No blocks yet. Generate a page to get started.</p>
        )}
      </div>
    </div>
  );
}
