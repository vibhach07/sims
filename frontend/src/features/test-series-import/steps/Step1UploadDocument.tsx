import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, Sparkles, AlertCircle } from 'lucide-react';

interface Step1UploadDocumentProps {
  onFileSelected: (file: File) => void;
  isLoading?: boolean;
  error?: string | null;
}

const SUPPORTED_FORMATS = [
  { label: 'PDF Documents', desc: 'Selectable & scanned multi-page PDFs with OCR', ext: '.pdf' },
  { label: 'Word Documents', desc: 'Formatted .docx with OMML formulas & tables', ext: '.docx' },
  { label: 'Spreadsheets', desc: 'Standard CSV & Excel (.xlsx) templates', ext: '.csv, .xlsx' },
  { label: 'Images & Photos', desc: 'PNG, JPG, WEBP scanned question papers (OCR)', ext: '.png, .jpg' },
  { label: 'Plain Text & JSON', desc: 'Raw .txt and structured JSON exports', ext: '.txt, .json' },
];

export const Step1UploadDocument: React.FC<Step1UploadDocumentProps> = ({ onFileSelected, isLoading, error }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelected(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="font-serif font-bold text-2xl sm:text-3xl text-[#061426] dark:text-[#F1EEE7]">
          Upload Question Paper Document
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-[#85878B] max-w-xl mx-auto">
          Ingest complete mock exams from PDF, Word, spreadsheets, or scanned images. Math formulas, units, and chemical equations are converted into high-speed KaTeX & mhchem.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-3xl p-10 text-center transition cursor-pointer flex flex-col items-center justify-center gap-4 ${
          isDragOver
            ? 'border-[#D9A52E] bg-amber-50/50 dark:bg-[#D5AD5B]/10'
            : 'border-slate-300 dark:border-[#383D44] hover:border-[#D9A52E] bg-white dark:bg-[#181A1D]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.tsv,.txt,.json,.png,.jpg,.jpeg,.webp"
          onChange={handleFileInput}
        />

        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-[#22252A] border border-amber-200 dark:border-[#383D44] flex items-center justify-center text-[#D9A52E] shadow-sm">
          <UploadCloud className="w-8 h-8" />
        </div>

        <div>
          <p className="font-bold text-base text-[#061426] dark:text-[#F1EEE7]">
            {isLoading ? 'Uploading & initializing pipeline...' : 'Click or drag & drop question paper here'}
          </p>
          <p className="text-xs text-slate-500 dark:text-[#85878B] mt-1">
            No file size limit. Streams large multi-page scans, books, and high-res documents.
          </p>
        </div>

        <button
          type="button"
          disabled={isLoading}
          className="px-6 py-2.5 rounded-xl bg-[#061426] dark:bg-[#2C3036] hover:bg-[#1C2C42] text-white text-xs font-bold transition shadow"
        >
          Browse Files
        </button>
      </div>

      {/* Supported Formats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SUPPORTED_FORMATS.map((fmt) => (
          <div
            key={fmt.label}
            className="p-3.5 rounded-xl border border-slate-200 dark:border-[#2C3036] bg-slate-50/50 dark:bg-[#22252A]/50 space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[#061426] dark:text-[#F1EEE7] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#D9A52E]" /> {fmt.label}
              </span>
              <span className="text-[10px] font-mono text-slate-400">{fmt.ext}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#85878B]">{fmt.desc}</p>
          </div>
        ))}
      </div>

      {/* Chemical Engineering Math Note */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-[#D9A52E]/30 flex items-start gap-3 text-xs">
        <Sparkles className="w-5 h-5 text-[#D9A52E] flex-shrink-0 mt-0.5" />
        <div className="space-y-1 text-slate-700 dark:text-[#B8B6B0]">
          <strong className="block text-[#061426] dark:text-[#F1EEE7] font-bold">
            GATE Chemical Engineering Formula Engine
          </strong>
          <p>
            Equations ($H_2SO_4$, $\mathrm&#123;kg\,m^&#123;-3&#125;&#125;$, reaction arrows $\ce&#123;A + B -&gt; C&#125;$, integrals and fractions) are automatically mapped to standard LaTeX &amp; mhchem representations.
          </p>
        </div>
      </div>
    </div>
  );
};
