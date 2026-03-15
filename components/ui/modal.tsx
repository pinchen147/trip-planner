'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-10"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="flex flex-col w-full max-w-[560px] max-h-[720px]"
        style={{ background: '#111111', borderRadius: 2 }}
      >
        <div className="flex items-center justify-between px-6 min-h-[64px] shrink-0">
          <span
            className="text-sm font-semibold text-white uppercase"
            style={{ fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)", letterSpacing: 1.5 }}
          >
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-[#666] hover:text-white transition-colors cursor-pointer bg-transparent border-none p-1"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-6">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 min-h-[64px] shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
