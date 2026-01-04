import React, { useState } from 'react';

interface DestructiveConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmationPhrase: string;
  t: (key: string) => string;
}

const DestructiveConfirmationModal: React.FC<DestructiveConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message, confirmationPhrase, t }) => {
  const [inputValue, setInputValue] = useState('');

  if (!isOpen) return null;

  const isConfirmed = inputValue === confirmationPhrase;

  const handleConfirm = () => {
    if (isConfirmed) {
      onConfirm();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full m-4">
        <div className="p-6">
          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
              <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                {title}
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  {message}
                </p>
              </div>
            </div>
          </div>
           <div className="mt-4 pt-4 border-t">
                <label htmlFor="confirmation-input" className="block text-sm font-medium text-gray-700">
                    {t('destructiveModal.prompt')} <strong className="text-red-600 font-mono">`{confirmationPhrase}`</strong>
                </label>
                <input
                    type="text"
                    id="confirmation-input"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-red-500 focus:border-red-500"
                    autoComplete="off"
                />
            </div>
        </div>
        <div className="bg-gray-50 px-4 py-3 rounded-b-lg flex sm:justify-center">
          <div className="responsive-btn-group sm:flex-row-reverse">
            <button
              type="button"
              className="bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
              onClick={handleConfirm}
              disabled={!isConfirmed}
            >
              {t('destructiveModal.confirmButton')}
            </button>
            <button
              type="button"
              className="bg-gray-200 text-gray-800 hover:bg-gray-300 border-gray-300"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DestructiveConfirmationModal;