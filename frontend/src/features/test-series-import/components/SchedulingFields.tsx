import React from 'react';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { toLocalDatetimeInput, validateScheduleWindow, formatISTDisplay } from '../utils/scheduling';

interface SchedulingFieldsProps {
  hasSchedule: boolean;
  onHasScheduleChange: (val: boolean) => void;
  startsAt?: string;
  onStartsAtChange: (val?: string) => void;
  endsAt?: string;
  onEndsAtChange: (val?: string) => void;
}

export const SchedulingFields: React.FC<SchedulingFieldsProps> = ({
  hasSchedule,
  onHasScheduleChange,
  startsAt,
  onStartsAtChange,
  endsAt,
  onEndsAtChange
}) => {
  const windowValidation = validateScheduleWindow(startsAt, endsAt);

  return (
    <div className="space-y-3 p-4 rounded-xl border border-slate-200 dark:border-[#383D44] bg-slate-50/50 dark:bg-[#22252A]/50">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-[#061426] dark:text-[#F1EEE7]">
          <input
            type="checkbox"
            checked={hasSchedule}
            onChange={(e) => onHasScheduleChange(e.target.checked)}
            className="rounded text-[#D9A52E] focus:ring-[#D9A52E]"
          />
          <span>Schedule Exam Availability Window</span>
        </label>
        <span className="text-[11px] text-slate-500 dark:text-[#85878B]">All times in Indian Standard Time (IST)</span>
      </div>

      {hasSchedule && (
        <div className="space-y-3 pt-2 border-t border-slate-200/60 dark:border-[#2C3036]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#B8B6B0] mb-1">
                Window Starts At (IST)
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="datetime-local"
                  value={toLocalDatetimeInput(startsAt)}
                  onChange={(e) => onStartsAtChange(e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-[#383D44] bg-white dark:bg-[#181A1D] text-[#061426] dark:text-[#F1EEE7] outline-none focus:ring-1 focus:ring-[#D9A52E]"
                />
              </div>
              {startsAt && (
                <span className="text-[10px] text-slate-500 dark:text-[#85878B] mt-1 block">
                  Starts: {formatISTDisplay(startsAt)}
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#B8B6B0] mb-1">
                Window Closes At (IST)
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="datetime-local"
                  value={toLocalDatetimeInput(endsAt)}
                  onChange={(e) => onEndsAtChange(e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-[#383D44] bg-white dark:bg-[#181A1D] text-[#061426] dark:text-[#F1EEE7] outline-none focus:ring-1 focus:ring-[#D9A52E]"
                />
              </div>
              {endsAt && (
                <span className="text-[10px] text-slate-500 dark:text-[#85878B] mt-1 block">
                  Ends: {formatISTDisplay(endsAt)}
                </span>
              )}
            </div>
          </div>

          {!windowValidation.isValid && (
            <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{windowValidation.error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

