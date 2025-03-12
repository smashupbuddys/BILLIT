import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { ConfirmationDialogProps } from '../pages/BulkEntry/types';

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  show,
  entry,
  onConfirm,
  onCancel
}) => {
  if (!show || !entry) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center">
          <div className="mr-4">
            <AlertTriangle className="w-10 h-10 text-yellow-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Duplicate Payment</h3>
            <p className="mt-2 text-sm text-gray-500">
              A payment with the same date and amount already exists. Do you want to proceed?
            </p>
            <div className="mt-2 text-sm text-gray-600">
              <p>Date: {new Date(entry.data.date).toLocaleDateString()}</p>
              <p>Amount: ₹{entry.data.amount.toLocaleString()}</p>
              {entry.data.party_name && (
                <p>Party: {entry.data.party_name}</p>
              )}
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
