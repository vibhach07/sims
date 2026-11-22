import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Link as LinkIcon, X, AlertCircle, CheckCircle, Image as ImageIcon, Loader2 } from 'lucide-react';

export interface ImageInputValue {
  file: File | null;
  url: string;
}

interface ImageInputProps {
  label?: string;
  currentImageUrl?: string | null;
  value?: ImageInputValue;
  onChange: (val: ImageInputValue) => void;
  maxSizeMB?: number;
  className?: string;
}

export const ImageInput: React.FC<ImageInputProps> = ({
  label = 'Profile Photo / Image',
  currentImageUrl,
  value,
  onChange,
  maxSizeMB = 2,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync initial state from currentImageUrl or value
  useEffect(() => {
    if (value?.file) {
      const objUrl = URL.createObjectURL(value.file);
      setPreviewUrl(objUrl);
      setActiveTab('upload');
      return () => URL.revokeObjectURL(objUrl);
    } else if (value?.url) {
      setUrlInput(value.url);
      setPreviewUrl(value.url);
      setActiveTab('url');
    } else if (currentImageUrl) {
      setPreviewUrl(currentImageUrl);
      setUrlInput(currentImageUrl.startsWith('http') ? currentImageUrl : '');
    } else {
      setPreviewUrl(null);
    }
  }, [value, currentImageUrl]);

  const handleFile = (file: File) => {
    setFileError(null);
    setUrlError(null);

    // Validate size
    if (file.size > maxSizeMB * 1024 * 1024) {
      setFileError(`File size exceeds ${maxSizeMB}MB limit.`);
      return;
    }

    // Validate MIME
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setFileError('Invalid format. Only JPG, PNG, and WebP are allowed.');
      return;
    }

    // Progress animation
    setUploadProgress(20);
    const timer1 = setTimeout(() => setUploadProgress(65), 100);
    const timer2 = setTimeout(() => {
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(null), 300);
    }, 250);

    const objUrl = URL.createObjectURL(file);
    setPreviewUrl(objUrl);
    setUrlInput('');
    onChange({ file, url: '' });

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    setUrlInput(val);
    setFileError(null);

    if (!val) {
      setUrlError(null);
      setPreviewUrl(null);
      onChange({ file: null, url: '' });
      return;
    }

    if (!val.startsWith('https://')) {
      setUrlError('URL must use secure https:// protocol.');
      setPreviewUrl(null);
      return;
    }

    setUrlError(null);
    setPreviewUrl(val);
    onChange({ file: null, url: val });
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    setUrlInput('');
    setFileError(null);
    setUrlError(null);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onChange({ file: null, url: '' });
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="block font-semibold text-[#263347] text-xs">{label}</label>}

      {/* Tabs */}
      <div className="flex border-b border-[#E3D8BE] text-xs font-medium">
        <button
          type="button"
          onClick={() => {
            setActiveTab('upload');
            setFileError(null);
            setUrlError(null);
          }}
          className={`pb-2 px-3 flex items-center gap-1.5 transition-colors ${
            activeTab === 'upload'
              ? 'border-b-2 border-[#D9A52E] text-[#061426] font-bold'
              : 'text-[#687386] hover:text-[#061426]'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Upload Image</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('url');
            setFileError(null);
            setUrlError(null);
          }}
          className={`pb-2 px-3 flex items-center gap-1.5 transition-colors ${
            activeTab === 'url'
              ? 'border-b-2 border-[#D9A52E] text-[#061426] font-bold'
              : 'text-[#687386] hover:text-[#061426]'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span>Paste URL</span>
        </button>
      </div>

      {/* Tab 1: Upload */}
      {activeTab === 'upload' && (
        <div className="space-y-2">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-[#D9A52E] bg-amber-50/50'
                : 'border-[#E3D8BE] hover:border-[#D9A52E] bg-[#FAFAF8]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center gap-1.5 text-xs text-[#687386]">
              <UploadCloud className="w-6 h-6 text-[#A87519]" />
              <p>
                <span className="font-bold text-[#061426]">Click to upload</span> or drag and drop
              </p>
              <p className="text-[10px] text-[#A3824A]">JPG, PNG, or WebP (max {maxSizeMB}MB)</p>
            </div>
          </div>

          {uploadProgress !== null && (
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-[#D9A52E] h-1.5 transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          {fileError && (
            <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{fileError}</span>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Paste URL */}
      {activeTab === 'url' && (
        <div className="space-y-2">
          <div className="relative">
            <input
              type="url"
              placeholder="https://images.unsplash.com/photo-..."
              value={urlInput}
              onChange={handleUrlChange}
              className="w-full text-xs p-2.5 rounded-lg border border-[#E3D8BE] focus:outline-none focus:border-[#D9A52E]"
            />
            {urlInput && (
              <button
                type="button"
                onClick={handleRemove}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {urlError && (
            <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{urlError}</span>
            </div>
          )}
        </div>
      )}

      {/* Preview Section */}
      {previewUrl && (
        <div className="flex items-center gap-3 p-2.5 bg-white border border-[#E3D8BE] rounded-xl">
          <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-[#D9A52E] flex-shrink-0 bg-slate-50">
            <img
              src={previewUrl}
              alt="Preview"
              onError={() => {
                setUrlError('Image could not be loaded from provided source.');
              }}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Image Selected</span>
            </div>
            <p className="text-[10px] text-[#687386] truncate">
              {value?.file ? value.file.name : urlInput || 'Current image in use'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
            title="Remove image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageInput;
