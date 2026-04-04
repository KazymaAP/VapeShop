import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // TODO: Отправить ошибку в Sentry или логирование сервиса
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
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
              <pre className="bg-bgDark text-danger text-xs p-4 rounded mb-4 overflow-auto max-h-40">
                {this.state.error.message}
              </pre>
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
