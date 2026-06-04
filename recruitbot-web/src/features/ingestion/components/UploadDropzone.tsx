import type { ChangeEvent, DragEvent } from 'react';

interface UploadDropzoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
  isActive: boolean;
  setIsActive: (active: boolean) => void;
}

export function UploadDropzone({ onFileSelected, disabled, isActive, setIsActive }: UploadDropzoneProps) {
  const handleFile = (file: File | null) => {
    if (!file) return;
    onFileSelected(file);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    handleFile(file);
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsActive(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    handleFile(file);
  };

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (disabled) return;
    setIsActive(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsActive(false);
  };

  return (
    <label
      htmlFor="resume-upload"
      className={
        'group block rounded-3xl border border-dashed p-10 text-center transition ' +
        (isActive
          ? 'border-indigo-400/70 bg-slate-950/90 shadow-[0_0_0_4px_rgba(99,102,241,0.08)]'
          : 'border-slate-700 bg-slate-950/80 hover:border-slate-500')
      }
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        id="resume-upload"
        type="file"
        accept="application/pdf"
        className="sr-only"
        disabled={disabled}
        onChange={handleInputChange}
      />
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600/10 text-indigo-300">
        <span className="text-3xl">📄</span>
      </div>
      <p className="mt-6 text-lg font-semibold text-white">Drag & drop your PDF here</p>
      <p className="mt-2 text-sm text-slate-400">
        Or click the area to browse files. PDF only, max 5MB.
      </p>
      <p className="mt-4 text-xs text-slate-500">
        {isActive ? 'Release to upload the file' : 'Drop the file anywhere inside this box'}
      </p>
    </label>
  );
}
