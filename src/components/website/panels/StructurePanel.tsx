import { Page } from '../../../types/website';

interface StructurePanelProps {
  pages: Page[];
  selectedPageId: string | null;
  onSelectPage: (id: string) => void;
  onAddPage: () => void;
  onRemovePage: (id: string) => void;
}

export function StructurePanel({
  pages,
  selectedPageId,
  onSelectPage,
  onAddPage,
  onRemovePage,
}: StructurePanelProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Site Structure</h2>
        <button
          onClick={onAddPage}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Page
        </button>
      </div>
      <div className="space-y-2">
        {pages.map((page) => (
          <div
            key={page.id}
            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer ${
              selectedPageId === page.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
            }`}
            onClick={() => onSelectPage(page.id)}
          >
            <div>
              <div className="font-medium">{page.title}</div>
              <div className="text-sm text-gray-500">{page.path}</div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemovePage(page.id);
              }}
              className="text-red-600 hover:text-red-700 text-sm"
            >
              Remove
            </button>
          </div>
        ))}
        {!pages.length && (
          <p className="text-gray-500 text-center py-4">No pages yet</p>
        )}
      </div>
    </div>
  );
}
