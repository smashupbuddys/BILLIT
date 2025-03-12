import React, { useState, useRef } from 'react';
    import { Download, Upload, Loader, HardDrive, Settings, FileText } from 'lucide-react';
    import { exportDatabase, importDatabase, type BackupData } from '../lib/db/backup';
    import { saveToFile, loadFromFile } from '../lib/db';
    import { generatePDF } from '../utils/pdfGenerator';
    import initSqlJs from 'sql.js';
    import db from '../lib/db';

    const BackupRestore = () => {
      const [isExporting, setIsExporting] = useState(false);
      const [isImporting, setIsImporting] = useState(false);
      const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
      const [showDropdown, setShowDropdown] = useState(false);
      const fileInputRef = useRef<HTMLInputElement>(null);
      const dbFileInputRef = useRef<HTMLInputElement>(null);

      const handleExport = async () => {
        try {
          setIsExporting(true);
          const data = await exportDatabase();
          
          // Convert JSON to Blob
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });

          // Change the file extension to .jpg (disguised JSON file)
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `finance-backup-${new Date().toISOString().split('T')[0]}.jpg`; 
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (error) {
          console.error('Error exporting data:', error);
          alert('Error exporting data. Please try again.');
        } finally {
          setIsExporting(false);
          setShowDropdown(false);
        }
      };

      const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Check for .jpg or .json file extension for JSON import
        if (!file.name.endsWith('.jpg') && !file.name.endsWith('.json')) {
          alert('Invalid file format. Please upload a .jpg or .json backup file.');
          return;
        }

        try {
          setIsImporting(true);

          // Read file and parse as JSON
          const text = await file.text();
          const data = JSON.parse(text) as BackupData;

          // Validate backup format
          if (!data.version || !data.timestamp || !data.tables) {
            throw new Error('Invalid backup file format');
          }

          // Confirm import
          const confirmed = window.confirm(
            'This will replace all existing data with the backup data. Are you sure you want to continue?'
          );
          
          if (!confirmed) return;

          // Import data
          await importDatabase(data);

          alert('Data imported successfully! Please refresh the page.');
          window.location.reload();
        } catch (error) {
          console.error('Error importing data:', error);
          alert('Error importing data. Please check the file format and try again.');
        } finally {
          setIsImporting(false);
          event.target.value = ''; // Reset file input
          setShowDropdown(false);
        }
      };

      const handleExportToFile = async () => {
        try {
          setIsExporting(true);
          await saveToFile();
          alert('Database file exported successfully! You can now copy the file to your pendrive.');
        } catch (error) {
          console.error('Error exporting database file:', error);
          alert('Error exporting database file. Please try again.');
        } finally {
          setIsExporting(false);
          setShowDropdown(false);
        }
      };

      const handleImportFromFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.png') && !file.name.endsWith('.db')) {
          alert('Invalid file format. Please upload a .png or .db database file.');
          return;
        }

        try {
          setIsImporting(true);

          // Confirm import
          const confirmed = window.confirm(
            'This will replace all existing data with the database file. Are you sure you want to continue?'
          );
          
          if (!confirmed) return;

          // Import database file
          await loadFromFile(file);
          
          alert('Database imported successfully! Please refresh the page.');
          window.location.reload();
        } catch (error) {
          console.error('Error importing database file:', error);
          alert('Error importing database file. Please check the file and try again.');
        } finally {
          setIsImporting(false);
          event.target.value = ''; // Reset file input
          setShowDropdown(false);
        }
      };

      const handleExportPDF = async () => {
        try {
          setIsGeneratingPDF(true);
          await generatePDF();
        } catch (error) {
          console.error('Error generating PDF:', error);
          alert('Error generating PDF report. Please try again.');
        } finally {
          setIsGeneratingPDF(false);
          setShowDropdown(false);
        }
      };

      return (
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            <Settings className="w-4 h-4 mr-2" />
            Backup &amp; Restore
          </button>
          <div className={`
            absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-md shadow-md p-2 w-56 z-50
            ${showDropdown ? 'block' : 'hidden'}
          `}>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="block w-full text-left px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
            >
              {isExporting ? (
                <Loader className="w-4 h-4 mr-2 animate-spin inline" />
              ) : (
                <Download className="w-4 h-4 mr-2 inline" />
              )}
              Backup Data
            </button>

            <label className="block w-full text-left px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md cursor-pointer">
              {isImporting ? (
                <Loader className="w-4 h-4 mr-2 animate-spin inline" />
              ) : (
                <Upload className="w-4 h-4 mr-2 inline" />
              )}
              Restore Data
              <input
                type="file"
                accept=".jpg,.json"
                onChange={handleImport}
                disabled={isImporting}
                className="hidden"
                ref={fileInputRef}
              />
            </label>

            <button
              onClick={handleExportToFile}
              disabled={isExporting}
              className="block w-full text-left px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
            >
              {isExporting ? (
                <Loader className="w-4 h-4 mr-2 animate-spin inline" />
              ) : (
                <HardDrive className="w-4 h-4 mr-2 inline" />
              )}
              Backup DB File
            </button>

            <label className="block w-full text-left px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md cursor-pointer">
              {isImporting ? (
                <Loader className="w-4 h-4 mr-2 animate-spin inline" />
              ) : (
                <HardDrive className="w-4 h-4 mr-2 inline" />
              )}
              Restore DB File
              <input
                type="file"
                accept=".png,.db"
                onChange={handleImportFromFile}
                disabled={isImporting}
                className="hidden"
                ref={dbFileInputRef}
              />
            </label>

            <button
              onClick={handleExportPDF}
              disabled={isGeneratingPDF}
              className="block w-full text-left px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md flex items-center"
            >
              {isGeneratingPDF ? (
                <Loader className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Export Report
            </button>
          </div>
        </div>
      );
    };

    export default BackupRestore;
