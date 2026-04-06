import React, { ErrorInfo, ReactNode } from 'react';
import { logger } from '../lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Omit<State, 'errorInfo'> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log structured error for production monitoring
    logger.error('ErrorBoundary caught an error', error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: 'ErrorBoundary component',
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-bgDark text-textPrimary">
          <div className="bg-cardBg border border-border rounded-lg p-8 max-w-md text-center">
            <h1 className="text-2xl font-bold text-danger mb-4">⚠️ Ошибка приложения</h1>
            <p className="text-textSecondary mb-4">
              К сожалению, что-то пошло не так. Пожалуйста, попробуйте ещё раз.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <>
                <pre className="bg-bgDark text-danger text-xs p-4 rounded mb-4 overflow-auto max-h-40">
                  {this.state.error.message}
                </pre>
                {this.state.errorInfo && (
                  <pre className="bg-bgDark text-warning text-xs p-4 rounded mb-4 overflow-auto max-h-40">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </>
            )}
            <button
              onClick={this.handleReset}
              className="bg-neon hover:bg-purple-600 text-white font-bold py-2 px-6 rounded transition"
            >
              Вернуться
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
