import React from 'react';
import { useUIStore } from '../../stores/uiStore';
import { Info, AlertCircle, CheckCircle2, X } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => {
        let Icon = Info;
        let colorClasses = 'border-[#E7E6DF] bg-[#FFFFFF] text-[#171717]';
        if (toast.type === 'error') {
          Icon = AlertCircle;
          colorClasses = 'border-rose-200 bg-rose-50 text-rose-700';
        } else if (toast.type === 'success') {
          Icon = CheckCircle2;
          colorClasses = 'border-emerald-200 bg-emerald-50 text-emerald-800';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-[16px] shadow-[0_4px_20px_rgba(0,0,0,0.06)] border text-xs animate-in slide-in-from-bottom-2 duration-200 ${colorClasses}`}
          >
            <Icon size={16} className="shrink-0" />
            <span className="flex-1 font-medium leading-relaxed">
              {toast.message}
            </span>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-full hover:bg-black/5 transition-colors cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
