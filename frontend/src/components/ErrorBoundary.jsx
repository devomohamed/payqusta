import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { withTranslation } from 'react-i18next';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    const { t } = this.props;
    if (this.state.hasError) {
      return (
        <div className="app-shell-bg min-h-[400px] flex items-center justify-center p-8">
          <div className="app-surface app-eye-candy-ring max-w-md rounded-[2rem] p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="app-text-strong mb-2 text-xl font-black">{t('error_boundary.title')}</h2>
            <p className="app-text-soft mb-6 text-sm leading-7">
              {this.state.error?.message || t('error_boundary.description')}
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-primary-500/25 transition-transform hover:-translate-y-0.5"
              >
                <RefreshCw className="h-4 w-4" />
                {t('error_boundary.retry')}
              </button>
              <button
                onClick={() => { window.location.href = '/'; }}
                className="app-surface-muted app-text-body inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
              >
                <Home className="h-4 w-4" />
                {t('error_boundary.home')}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default withTranslation('admin')(ErrorBoundary);
