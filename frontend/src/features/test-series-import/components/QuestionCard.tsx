import React, { useState } from 'react';
import { ImportQuestion } from '../types/import.types';
import { MathRenderer } from './math/MathRenderer';
import { MathEditor } from './math/MathEditor';
import { Edit3, Check, Trash2, AlertTriangle, Crop, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { ImageCropEditor } from './ImageCropEditor';

interface QuestionCardProps {
  question: ImportQuestion;
  index: number;
  onUpdate: (updated: ImportQuestion) => void;
  onDelete: () => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ question, index, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleCorrectOptionChange = (opt: 'A' | 'B' | 'C' | 'D') => {
    onUpdate({ ...question, correct_option: opt });
  };

  return (
    <div
      className={`p-5 rounded-2xl border transition shadow-xs bg-white dark:bg-[#181A1D] ${
        question.needs_review
          ? 'border-amber-300 dark:border-amber-700/60 ring-1 ring-amber-300/40'
          : 'border-slate-200 dark:border-[#383D44]'
      }`}
    >
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#2C3036]">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-[#2C3036] text-[#F0C45B] font-bold text-xs flex items-center justify-center">
            {question.question_number || index + 1}
          </span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-[#22252A] text-slate-700 dark:text-[#B8B6B0]">
            {question.subject || 'General'}
          </span>
          {question.has_math && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 flex items-center gap-1 border border-blue-200 dark:border-blue-900">
              <Sparkles className="w-3 h-3" /> Math / Chem
            </span>
          )}
          {question.needs_review && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 flex items-center gap-1 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="w-3 h-3" /> Needs Review
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-[#85878B] mr-2">
            <span>+{question.marks}m</span>
            <span>/</span>
            <span>-{question.negative_marks}m</span>
          </div>

          {question.image_url && (
            <button
              type="button"
              onClick={() => setIsCropOpen(true)}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-[#383D44] hover:bg-slate-100 dark:hover:bg-[#22252A] text-slate-600 dark:text-[#B8B6B0] transition"
              title="Re-crop Figure"
            >
              <Crop className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              isEditing
                ? 'bg-[#D9A52E] text-[#061426]'
                : 'border border-slate-300 dark:border-[#383D44] hover:bg-slate-100 dark:hover:bg-[#22252A] text-slate-700 dark:text-[#F1EEE7]'
            }`}
          >
            {isEditing ? <Check className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
            {isEditing ? 'Done Editing' : 'Edit LaTeX'}
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 transition"
            title="Delete Question"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="pt-4 space-y-4">
        {/* Attached Figure if present */}
        {question.image_url && (
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#101113] border border-slate-200 dark:border-[#2C3036] flex items-center justify-center max-h-52 overflow-hidden">
            <img src={question.image_url} alt="Question figure" className="max-h-48 object-contain rounded" />
          </div>
        )}

        {/* Question Statement */}
        {isEditing ? (
          <MathEditor
            label="Question Statement"
            value={question.question_en}
            onChange={(val) => onUpdate({ ...question, question_en: val, has_math: val.includes('$') })}
            originalImageUrl={question.image_url}
          />
        ) : (
          <div className="text-sm font-medium text-[#061426] dark:text-[#F1EEE7] leading-relaxed">
            <MathRenderer text={question.question_en} block />
            {question.question_hi && (
              <div className="pt-2 text-slate-600 dark:text-[#B8B6B0] text-xs border-t border-slate-100 dark:border-[#2C3036] mt-2">
                <MathRenderer text={question.question_hi} />
              </div>
            )}
          </div>
        )}

        {/* Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {(['A', 'B', 'C', 'D'] as const).map((opt) => {
            const isCorrect = question.correct_option === opt;
            const optKey = `option_${opt.toLowerCase()}_en` as keyof ImportQuestion;
            const optValue = (question[optKey] as string) || '';

            return (
              <div
                key={opt}
                className={`p-3 rounded-xl border transition flex flex-col justify-between gap-2 ${
                  isCorrect
                    ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                    : 'border-slate-200 dark:border-[#2C3036] bg-slate-50/50 dark:bg-[#22252A]/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-md font-bold text-xs flex items-center justify-center flex-shrink-0 ${
                        isCorrect
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 dark:bg-[#2C3036] text-slate-700 dark:text-[#F1EEE7]'
                      }`}
                    >
                      {opt}
                    </span>
                    {!isEditing && (
                      <div className="text-xs text-[#061426] dark:text-[#F1EEE7] font-medium leading-relaxed">
                        <MathRenderer text={optValue} />
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCorrectOptionChange(opt)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition cursor-pointer ${
                      isCorrect
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-[#2C3036] hover:bg-emerald-100 text-slate-600 dark:text-[#B8B6B0]'
                    }`}
                  >
                    {isCorrect ? 'Correct Answer' : 'Set as Correct'}
                  </button>
                </div>

                {isEditing && (
                  <input
                    type="text"
                    value={optValue}
                    onChange={(e) => onUpdate({ ...question, [optKey]: e.target.value })}
                    className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-[#383D44] bg-white dark:bg-[#181A1D] text-[#061426] dark:text-[#F1EEE7]"
                    placeholder={`Option ${opt} text / LaTeX...`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Explanation Toggle */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowExplanation(!showExplanation)}
            className="text-xs font-semibold text-[#A87519] dark:text-[#D5AD5B] hover:underline flex items-center gap-1"
          >
            {showExplanation ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showExplanation ? 'Hide Explanation' : 'View / Edit Explanation'}
          </button>

          {showExplanation && (
            <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-[#22252A] border border-slate-200 dark:border-[#383D44] text-xs">
              {isEditing ? (
                <MathEditor
                  label="Explanation"
                  value={question.explanation_en || ''}
                  onChange={(val) => onUpdate({ ...question, explanation_en: val })}
                />
              ) : (
                <div>
                  <strong className="block text-slate-700 dark:text-[#F1EEE7] mb-1">Explanation:</strong>
                  <MathRenderer text={question.explanation_en || 'No explanation provided.'} block />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isCropOpen && question.image_url && (
        <ImageCropEditor
          imageUrl={question.image_url}
          onCropComplete={(croppedUrl) => onUpdate({ ...question, image_url: croppedUrl })}
          onClose={() => setIsCropOpen(false)}
        />
      )}
    </div>
  );
};

