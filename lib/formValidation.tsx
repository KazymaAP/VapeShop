/**
 * Утилиты для consistent loading state и form validation
 */

/**
 * Loading Spinner компонент
 */
export function LoadingSpinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClass = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }[size];

  return (
    <div
      className={`${sizeClass} border-3 border-gray-200 border-t-neon rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Загрузка..."
    />
  );
}

/**
 * Form Field компонент с validation feedback
 */
interface FormFieldProps {
  label: string;
  error?: string;
  success?: boolean;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}

export function FormField({ label, error, success, children, required = false, hint }: FormFieldProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-textPrimary mb-2">
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>

      <div className="relative">
        {children}

        {/* Error state */}
        {error && (
          <span className="block text-xs text-danger mt-1" role="alert">
            ✕ {error}
          </span>
        )}

        {/* Success state */}
        {success && !error && (
          <span className="block text-xs text-success mt-1">
            ✓ Правильно
          </span>
        )}

        {/* Hint */}
        {hint && !error && (
          <span className="block text-xs text-textSecondary mt-1">
            {hint}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Input компонент с встроенной валидацией
 */
interface ValidatedInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  success?: boolean;
}

export function ValidatedInput({ error, success, className = '', ...props }: ValidatedInputProps) {
  const baseClass = 'w-full px-3 py-2 border rounded-lg bg-cardBg text-textPrimary transition';
  const stateClass = error
    ? 'border-danger focus:ring-danger'
    : success
    ? 'border-success focus:ring-success'
    : 'border-border focus:ring-neon';

  return (
    <input
      className={`${baseClass} ${stateClass} focus:outline-none focus:ring-2 ${className}`}
      aria-invalid={!!error}
      aria-describedby={error ? `error-${props.name}` : undefined}
      {...props}
    />
  );
}

/**
 * Button компонент с loading state
 */
interface LoadingButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
}

export function LoadingButton({
  loading = false,
  loadingText = 'Загрузка...',
  children,
  disabled,
  className = '',
  ...props
}: LoadingButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        flex items-center justify-center gap-2
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-200
        ${className}
      `}
      {...props}
    >
      {loading && <LoadingSpinner size="sm" />}
      {loading ? loadingText : children}
    </button>
  );
}
