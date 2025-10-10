import { AlertCircle, CreditCard } from 'lucide-react';

interface OutOfCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  requiredCredits: number;
  actionName: string;
}

export function OutOfCreditsModal({
  isOpen,
  onClose,
  currentBalance,
  requiredCredits,
  actionName,
}: OutOfCreditsModalProps) {
  if (!isOpen) return null;

  const shortfall = requiredCredits - currentBalance;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Insufficient Credits
            </h3>
            <p className="text-sm text-gray-600">
              You need {requiredCredits} credits to {actionName}, but you only have{' '}
              {currentBalance} credit{currentBalance !== 1 ? 's' : ''}.
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Current Balance</span>
            <span className="text-sm font-semibold text-gray-900">
              {currentBalance} credits
            </span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Required</span>
            <span className="text-sm font-semibold text-gray-900">
              {requiredCredits} credits
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <span className="text-sm font-semibold text-gray-900">Shortfall</span>
            <span className="text-sm font-semibold text-red-600">
              {shortfall} credit{shortfall !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              window.open('/billing/credits', '_blank');
            }}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            Top Up Credits
          </button>
        </div>
      </div>
    </div>
  );
}
