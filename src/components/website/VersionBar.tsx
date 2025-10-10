import { useState, useEffect } from 'react';
import { Undo2, RotateCcw, FileText } from 'lucide-react';

interface Version {
  id: string;
  version: number;
  created_at: string;
  spec: any;
}

interface VersionBarProps {
  siteId: string;
  currentVersion?: number;
  onVersionChange?: () => void;
}

export function VersionBar({ siteId, currentVersion, onVersionChange }: VersionBarProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

  useEffect(() => {
    loadVersions();
  }, [siteId]);

  async function loadVersions() {
    try {
      const response = await fetch(`/api/versions?siteId=${siteId}`);
      if (!response.ok) return;
      const data = await response.json();
      setVersions(data.versions || []);
    } catch (error) {
      console.error('Failed to load versions:', error);
    }
  }

  async function handleUndo() {
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch('/api/versions/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId }),
      });

      if (response.ok) {
        await loadVersions();
        onVersionChange?.();
      }
    } catch (error) {
      console.error('Failed to undo:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(versionId: string) {
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch('/api/versions/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, versionId }),
      });

      if (response.ok) {
        await loadVersions();
        onVersionChange?.();
        setShowVersions(false);
      }
    } catch (error) {
      console.error('Failed to restore:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleViewDiff(versionId: string) {
    try {
      const response = await fetch(`/api/versions/diff?siteId=${siteId}&versionId=${versionId}`);
      if (response.ok) {
        const data = await response.json();
        alert(JSON.stringify(data.diff, null, 2));
      }
    } catch (error) {
      console.error('Failed to view diff:', error);
    }
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">
          Version: <span className="font-medium">{currentVersion || 1}</span>
        </span>
      </div>

      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={handleUndo}
          disabled={loading || !versions.length}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          title="Undo last change"
        >
          <Undo2 className="w-4 h-4" />
          Undo
        </button>

        <button
          onClick={() => setShowVersions(!showVersions)}
          disabled={loading || !versions.length}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          title="View version history"
        >
          <RotateCcw className="w-4 h-4" />
          History
        </button>
      </div>

      {showVersions && (
        <div className="absolute top-12 right-4 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-3 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Version History</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {versions.map((version) => (
              <div key={version.id} className="p-3 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    Version {version.version}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(version.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRestore(version.id)}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Restore
                  </button>
                  <button
                    onClick={() => handleViewDiff(version.id)}
                    className="text-xs text-gray-600 hover:text-gray-700 flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3" />
                    View Diff
                  </button>
                </div>
              </div>
            ))}
          </div>
          {versions.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-500">
              No version history yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}
