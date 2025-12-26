'use client';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  itemName?: string;
  confirmButtonText?: string;
  confirmButtonColor?: 'red' | 'orange' | 'blue';
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  confirmButtonText = 'Delete',
  confirmButtonColor = 'red',
}: DeleteConfirmationModalProps) {
  const buttonColorClasses = {
    red: 'bg-red-600 hover:bg-red-700',
    orange: 'bg-orange-600 hover:bg-orange-700',
    blue: 'bg-blue-600 hover:bg-blue-700',
  };
  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      console.log('Delete confirmation: calling onConfirm');
      await Promise.resolve(onConfirm());
      console.log('Delete confirmation: onConfirm completed successfully');
      // Close modal after successful delete
      onClose();
    } catch (error) {
      console.error('Error in delete confirmation:', error);
      // Don't close modal on error, let parent handle it
      // Error is already handled by parent component
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 text-center mb-2">{title}</h3>
        <p className="text-gray-600 text-center mb-6">
          {message}
          {itemName && (
            <span className="font-semibold text-[#1C4633] block mt-2">"{itemName}"</span>
          )}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 px-4 py-2.5 text-white rounded-lg transition-colors font-medium ${buttonColorClasses[confirmButtonColor]}`}
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
}

