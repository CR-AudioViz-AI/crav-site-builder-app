import { AlertCircle } from "lucide-react";

interface BusinessBannerProps {
  hasProfile: boolean;
  onSetup?: () => void;
}

export function BusinessBanner({ hasProfile, onSetup }: BusinessBannerProps) {
  if (hasProfile) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-amber-900 mb-1">
            Complete your business profile
          </h3>
          <p className="text-sm text-amber-800 mb-3">
            Add your business name and details for better website drafts. You can still
            generate now with smart defaults.
          </p>
          {onSetup && (
            <button
              onClick={onSetup}
              className="text-sm font-medium text-amber-900 hover:text-amber-700 underline"
            >
              Set up profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
