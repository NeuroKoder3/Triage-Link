import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[TriageLink] Uncaught error:', error, errorInfo);

    if (window.electronAPI?.db?.audit) {
      window.electronAPI.db.audit.log({
        action: 'system.error',
        severity: 'error',
        details: JSON.stringify({ message: error.message, stack: error.stack?.substring(0, 500), component: errorInfo?.componentStack?.substring(0, 300) }),
      }).catch(() => {});
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: '#000000' }}>
          <div className="max-w-lg w-full text-center space-y-6">
            <AlertTriangle className="w-16 h-16 mx-auto" style={{ color: '#F59E0B' }} />
            <h1 className="text-2xl font-bold" style={{ color: '#60A5FA' }}>Something went wrong</h1>
            <p className="text-sm" style={{ color: '#93C5FD' }}>
              An unexpected error occurred. Your data is safe.
            </p>
            {this.state.error && (
              <div className="p-4 rounded-lg text-left text-xs overflow-auto max-h-40" style={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}>
                <pre style={{ color: '#FCA5A5' }}>{this.state.error.message}</pre>
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm"
                style={{ backgroundColor: '#60A5FA', color: '#000' }}
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm border"
                style={{ borderColor: '#60A5FA', color: '#60A5FA' }}
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
