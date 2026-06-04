import type { RefObject } from 'react';

interface ModalHeaderProps {
  name: string;
  title?: string;
  company?: string;
  onClose: () => void;
  closeButtonRef?: RefObject<HTMLButtonElement>;
}

export function ModalHeader({ name, title, company, onClose, closeButtonRef }: ModalHeaderProps) {
  return (
    <div className="sticky top-0 border-b border-slate-700 bg-slate-950 px-8 py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="candidate-modal-title" className="text-2xl font-bold text-white">
            {name}
          </h2>
          {(title || company) && (
            <p className="mt-1 text-sm text-slate-400">
              {title && company ? `${title} at ${company}` : title || company}
            </p>
          )}
        </div>
        <button
          ref={closeButtonRef}
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
          aria-label="Close modal"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
