import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { ConfirmationDialogProps } from '../types';

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  show,
  entry,
  onConfirm,
  onCancel
}) => {
  if (!show || !entry) return null;

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-6 w-6 text-yellow-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900">
              Duplicate {entry.type} Found
            </h3>
            <div className="mt-3">
              <p className="text-sm text-gray-500">
                A {entry.type} with these details already exists. Do you want to proceed anyway?
              </p>
              <div className="mt-4 bg-gray-50 rounded-md p-4">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Date:</dt>
                    <dd className="font-medium text-gray-900">{formatDate(entry.data.date)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Amount:</dt>
                    <dd className="font-medium text-gray-900">{formatAmount(entry.data.amount)}</dd>
                  </div>
                  {entry.data.party_name && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Party:</dt>
                      <dd className="font-medium text-gray-900">{entry.data.party_name}</dd>
                    </div>
                  )}
                  {entry.data.billNumber && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Bill Number:</dt>
                      <dd className="font-medium text-gray-900">{entry.data.billNumber}</dd>
                    </div>
                  )}
                  {entry.data.hasGST && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">GST:</dt>
                      <dd className="font-medium text-gray-900">Yes</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            Process Anyway
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
