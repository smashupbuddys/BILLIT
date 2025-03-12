import React from 'react';
    import { Calendar } from 'lucide-react';
    import { EntryFormProps } from '../types';

    const EntryForm: React.FC<EntryFormProps> = ({
      entries,
      selectedDate,
      onEntriesChange,
      onDateChange,
      isProcessing
    }) => {
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Date
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => onDateChange(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Enter Transactions
              </label>
              <textarea
                rows={10}
                value={entries}
                onChange={(e) => onEntriesChange(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="1. 23500&#10;7. 21506 net&#10;20. 9300 (Maa)&#10;Home 23988&#10;Alok Sal 30493&#10;SAJ (date: 13/12/24) 33201 GR 302"
              />
            </div>
          </div>
        </div>
      );
    };

    export default EntryForm;
