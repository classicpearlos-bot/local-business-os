'use client';

import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Download, 
  Users, 
  RefreshCw,
  FileCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { parseExcelOrCsvFile, ExcelParseResult } from '@/utils/excelImport';
import { Button } from './Button';
import { Badge } from './Badge';

export interface ExcelUploaderProps {
  onParsed: (result: ExcelParseResult, file: File) => void;
  onClear: () => void;
  parsedResult: ExcelParseResult | null;
}

export function ExcelUploader({ onParsed, onClear, parsedResult }: ExcelUploaderProps) {
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    if (!file) return;

    const validExts = ['.xlsx', '.xls', '.csv'];
    const hasValidExt = validExts.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setError('Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.');
      return;
    }

    setParsing(true);
    setFileName(file.name);

    try {
      const result = await parseExcelOrCsvFile(file);
      if (result.validContacts.length === 0) {
        setError('No valid phone numbers found in file. Ensure columns contain "Name" and "Phone Number" with country codes.');
        onClear();
      } else {
        onParsed(result, file);
      }
    } catch (err: any) {
      setError(`Failed to read file: ${err.message || 'Corrupt spreadsheet'}`);
      onClear();
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const downloadSampleExcel = () => {
    const sampleData = [
      { 'Full Name': 'John Doe', 'WhatsApp Phone': '+919876543210' },
      { 'Full Name': 'Jane Smith', 'WhatsApp Phone': '+919876543211' },
      { 'Full Name': 'Rahul Sharma', 'WhatsApp Phone': '+919876543212' },
      { 'Full Name': 'Sarah Williams', 'WhatsApp Phone': '+14155552671' }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audience');
    XLSX.writeFile(wb, 'whatsapp_audience_sample.xlsx');
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {parsedResult ? (
        /* Parsed Stats & Preview */
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">{fileName}</p>
                <p className="text-[10px] text-[#9E968D]">{parsedResult.totalRows} total rows processed</p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClear();
                setFileName('');
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              leftIcon={<X className="w-3.5 h-3.5 text-rose-500" />}
              className="bg-white hover:bg-rose-50 hover:border-rose-200"
            >
              Replace File
            </Button>
          </div>

          {/* KPI Mini Grid */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-2.5 bg-white rounded-xl border border-emerald-100 shadow-xs">
              <p className="text-[10px] uppercase font-bold text-emerald-600">Valid Numbers</p>
              <p className="text-lg font-extrabold text-emerald-700 mt-0.5">{parsedResult.validContacts.length}</p>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-slate-100 shadow-xs">
              <p className="text-[10px] uppercase font-bold text-[#7C756D]">Duplicates Removed</p>
              <p className="text-lg font-extrabold text-slate-600 mt-0.5">{parsedResult.duplicateCount}</p>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-rose-100 shadow-xs">
              <p className="text-[10px] uppercase font-bold text-rose-500">Invalid / Malformed</p>
              <p className="text-lg font-extrabold text-rose-600 mt-0.5">{parsedResult.invalidContacts.length}</p>
            </div>
          </div>

          {/* Sample Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-2.5 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-[#9E968D] uppercase tracking-wider">
              Preview (First {Math.min(3, parsedResult.validContacts.length)} contacts)
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {parsedResult.validContacts.slice(0, 3).map((c, i) => (
                <div key={i} className="p-2.5 flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{c.name}</span>
                  <span className="font-mono text-slate-600">{c.normalizedPhone}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Dropzone Card */
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 hover:border-indigo-500 bg-slate-50/60 hover:bg-indigo-50/20 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 flex items-center justify-center transition-colors shadow-xs">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">
              {parsing ? 'Parsing Excel spreadsheet...' : 'Upload Excel (.xlsx, .xls) or CSV file'}
            </p>
            <p className="text-[11px] text-[#7C756D] mt-0.5 font-medium">
              Drag and drop your client list here or click to browse files
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
            className="hidden"
          />

          <div className="pt-2" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadSampleExcel}
              leftIcon={<Download className="w-3 h-3" />}
              className="text-[11px] py-1 bg-white hover:bg-slate-50"
            >
              Download Sample Excel Template
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
