import React from 'react';

interface State {
  hasError: boolean;
  error?: Error | null;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console and allow developer tools to capture stack
    // In production you'd send this to an error tracking service
    // eslint-disable-next-line no-console
    console.error('Unhandled error in UI:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-6">
          <div className="max-w-2xl rounded-2xl border border-rose-600 bg-rose-900/10 p-6">
            <h2 className="text-2xl font-semibold text-rose-300">Something went wrong</h2>
            <p className="mt-3 text-sm text-slate-300">An unexpected error occurred while rendering the UI.</p>
            <pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-slate-200">{String(this.state.error)}</pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
