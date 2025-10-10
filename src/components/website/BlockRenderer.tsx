import { WebBlock } from '../../types/website';
import { RefreshCw } from 'lucide-react';

interface BlockRendererProps {
  block: WebBlock;
  onRegenerate?: (block: WebBlock) => void;
  editable?: boolean;
}

export function BlockRenderer({ block, onRegenerate, editable = false }: BlockRendererProps) {
  return (
    <div className="relative group border rounded-lg p-6 bg-white">
      {editable && onRegenerate && (
        <button
          onClick={() => onRegenerate(block)}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          title="Regenerate block"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      )}
      <div className="text-sm text-gray-500 mb-2 font-medium">
        {block.kind?.toUpperCase() || 'CONTENT'}
      </div>
      {block.html ? (
        <div dangerouslySetInnerHTML={{ __html: block.html }} />
      ) : (
        <div className="prose max-w-none">
          <pre className="whitespace-pre-wrap text-sm text-gray-700">
            {JSON.stringify(block, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
