import React, { useState } from 'react';
import { Crop, Check, X, RotateCcw } from 'lucide-react';
import { ImportService } from '../services/import.service';

interface ImageCropEditorProps {
  imageUrl: string;
  onCropComplete: (croppedUrl: string) => void;
  onClose: () => void;
}

export const ImageCropEditor: React.FC<ImageCropEditorProps> = ({ imageUrl, onCropComplete, onClose }) => {
  const [isCropping, setIsCropping] = useState(false);
  const [box, setBox] = useState({ x: 5, y: 5, width: 90, height: 90 });

  const handleApplyCrop = async () => {
    setIsCropping(true);
    try {
      // Fetch current image as blob
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const file = new File([blob], 'region.png', { type: blob.type });

      const cropRes = await ImportService.cropImage(file, box);
      if (cropRes && cropRes.image_url) {
        onCropComplete(cropRes.image_url);
      } else {
        onCropComplete(imageUrl);
      }
    } catch (e) {
      console.warn('Crop apply error:', e);
      onCropComplete(imageUrl);
    } finally {
      setIsCropping(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#181A1D] border border-slate-300 dark:border-[#383D44] rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#2C3036]">
          <div className="flex items-center gap-2">
            <Crop className="w-5 h-5 text-[#D9A52E]" />
            <h3 className="font-serif font-bold text-base text-[#061426] dark:text-[#F1EEE7]">
              Figure Crop & Alignment Editor
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#22252A] text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative border border-slate-200 dark:border-[#2C3036] rounded-xl overflow-hidden bg-slate-100 dark:bg-[#101113] p-4 flex items-center justify-center min-h-[260px]">
          <img src={imageUrl} alt="Target Crop" className="max-h-72 object-contain rounded" />
        </div>

        {/* Bounding controls */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-500 dark:text-[#85878B] mb-1">X Offset (%)</label>
            <input
              type="number"
              min={0}
              max={95}
              value={box.x}
              onChange={(e) => setBox({ ...box, x: Number(e.target.value) })}
              className="w-full p-1.5 rounded border border-slate-300 dark:border-[#383D44] bg-white dark:bg-[#22252A]"
            />
          </div>
          <div>
            <label className="block text-slate-500 dark:text-[#85878B] mb-1">Y Offset (%)</label>
            <input
              type="number"
              min={0}
              max={95}
              value={box.y}
              onChange={(e) => setBox({ ...box, y: Number(e.target.value) })}
              className="w-full p-1.5 rounded border border-slate-300 dark:border-[#383D44] bg-white dark:bg-[#22252A]"
            />
          </div>
          <div>
            <label className="block text-slate-500 dark:text-[#85878B] mb-1">Width (%)</label>
            <input
              type="number"
              min={5}
              max={100}
              value={box.width}
              onChange={(e) => setBox({ ...box, width: Number(e.target.value) })}
              className="w-full p-1.5 rounded border border-slate-300 dark:border-[#383D44] bg-white dark:bg-[#22252A]"
            />
          </div>
          <div>
            <label className="block text-slate-500 dark:text-[#85878B] mb-1">Height (%)</label>
            <input
              type="number"
              min={5}
              max={100}
              value={box.height}
              onChange={(e) => setBox({ ...box, height: Number(e.target.value) })}
              className="w-full p-1.5 rounded border border-slate-300 dark:border-[#383D44] bg-white dark:bg-[#22252A]"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => setBox({ x: 0, y: 0, width: 100, height: 100 })}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-[#383D44] text-xs font-semibold flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Box
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-[#383D44] text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isCropping}
              onClick={handleApplyCrop}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow"
            >
              <Check className="w-4 h-4" /> {isCropping ? 'Cropping...' : 'Apply Crop'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

