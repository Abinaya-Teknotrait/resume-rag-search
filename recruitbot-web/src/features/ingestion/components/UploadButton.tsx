import type { ChangeEvent } from 'react';

interface UploadButtonProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export function UploadButton({ onFileSelected, disabled }: UploadButtonProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    onFileSelected(file);
    event.target.value = '';
  };

  return (
    <label
      htmlFor="upload-button"
      className="inline-flex cursor-pointer items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
    >
      Select PDF
      <input
        id="upload-button"
        type="file"
        accept="application/pdf"
        className="sr-only"
        disabled={disabled}
        onChange={handleChange}
      />
    </label>
  );
}
