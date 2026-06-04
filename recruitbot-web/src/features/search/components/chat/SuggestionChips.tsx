interface SuggestionChipsProps {
  onSuggest: (query: string) => void;
}

const suggestions = [
  { icon: '🔍', label: 'Selenium QA 3 yrs', query: 'Selenium automation engineer 3 years' },
  { icon: '🐍', label: 'Python ML dev', query: 'Python developer with machine learning' },
  { icon: '☁️', label: 'Java AWS backend', query: 'Java backend developer AWS cloud' },
  { icon: '⚡', label: 'Lead QA Cypress', query: 'Lead QA engineer with Cypress and CI/CD' },
];

export function SuggestionChips({ onSuggest }: SuggestionChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion.query}
          type="button"
          onClick={() => onSuggest(suggestion.query)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:bg-slate-800"
        >
          <span>{suggestion.icon}</span>
          <span>{suggestion.label}</span>
        </button>
      ))}
    </div>
  );
}
