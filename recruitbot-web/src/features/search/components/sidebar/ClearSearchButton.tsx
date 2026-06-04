interface ClearChatButtonProps {
  onClear?: () => void;
}

export function ClearChatButton({ onClear }: ClearChatButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onClear?.()}
      className="mt-2 w-full rounded-3xl bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
    >
      Clear chat
    </button>
  );
}
