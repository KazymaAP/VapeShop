/**
 * Компонент для форм с inline валидацией и красивыми ошибками
 * Поддерживает: email, phone, password strength, custom validators
 */

import { useState, useCallback } from 'react';

interface ValidationRule {
  validate: (value: string) => boolean;
  message: string;
  type: 'error' | 'warning' | 'success';
}

interface ValidatedInputProps {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  rules?: ValidationRule[];
  required?: boolean;
  className?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export function ValidatedInput({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  rules = [],
  required = false,
  className = '',
  helperText,
  icon,
}: ValidatedInputProps) {
  const [touched, setTouched] = useState(false);
  const [errors, setErrors] = useState<ValidationRule[]>([]);

  // Валидация при изменении
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);

      // Проверяем правила валидации
      const newErrors = rules.filter((rule) => !rule.validate(newValue));
      setErrors(newErrors);
    },
    [onChange, rules]
  );

  // Проверка required
  const isValid = !required || value.trim().length > 0;
  const hasErrors = errors.length > 0;
  const isTouched = touched;

  const statusClass = !isTouched ? '' : isValid && !hasErrors ? 'border-success' : 'border-danger';

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      <label className="block text-sm font-medium text-textPrimary">
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>

      {/* Input */}
      <div className="relative">
        {/* Иконка слева */}
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary">{icon}</div>
        )}

        <input
          type={type}
          value={value}
          onChange={handleChange}
          onBlur={() => setTouched(true)}
          placeholder={placeholder}
          className={`w-full px-4 py-2.5 ${icon ? 'pl-10' : ''} rounded-lg bg-bgDark border-2 border-border text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon transition ${statusClass}`}
          required={required}
          aria-invalid={hasErrors}
          aria-describedby={hasErrors ? `${label}-error` : undefined}
        />

        {/* Status icon */}
        {isTouched && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {hasErrors ? (
              <span className="text-danger text-xl">✕</span>
            ) : isValid ? (
              <span className="text-success text-xl">✓</span>
            ) : null}
          </div>
        )}
      </div>

      {/* Ошибки */}
      {isTouched && hasErrors && (
        <div id={`${label}-error`} className="space-y-1">
          {errors.map((error, idx) => (
            <div key={idx} className={`text-sm flex items-start gap-2`}>
              <span
                className={`text-${error.type === 'error' ? 'danger' : error.type === 'warning' ? 'warning' : 'success'} mt-0.5`}
              >
                {error.type === 'error' ? '✕' : error.type === 'warning' ? '⚠' : '✓'}
              </span>
              <span
                className={`text-${error.type === 'error' ? 'danger' : error.type === 'warning' ? 'warning' : 'success'}`}
              >
                {error.message}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Подсказка */}
      {helperText && !hasErrors && <p className="text-xs text-textSecondary">{helperText}</p>}
    </div>
  );
}

// Predefined validators
export const Validators = {
  email: {
    validate: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: 'Введите корректный email',
    type: 'error' as const,
  },

  phone: {
    validate: (value: string) => /^[\d\s\-\+\(\)]{10,}$/.test(value),
    message: 'Введите корректный номер телефона',
    type: 'error' as const,
  },

  minLength: (min: number) => ({
    validate: (value: string) => value.length >= min,
    message: `Минимум ${min} символов`,
    type: 'error' as const,
  }),

  maxLength: (max: number) => ({
    validate: (value: string) => value.length <= max,
    message: `Максимум ${max} символов`,
    type: 'error' as const,
  }),

  passwordStrength: {
    validate: (value: string) => {
      // Требует: минимум 8 символов, букву, цифру, спецсимвол
      const hasLength = value.length >= 8;
      const hasLetter = /[a-zA-Z]/.test(value);
      const hasNumber = /\d/.test(value);
      const hasSpecial = /[!@#$%^&*]/.test(value);
      return hasLength && hasLetter && hasNumber && hasSpecial;
    },
    message: 'Пароль должен содержать букву, цифру и спецсимвол',
    type: 'error' as const,
  },

  match: (otherValue: string, fieldName: string = 'поле') => ({
    validate: (value: string) => value === otherValue,
    message: `Не совпадает с ${fieldName}`,
    type: 'error' as const,
  }),

  noSpaces: {
    validate: (value: string) => !/\s/.test(value),
    message: 'Пробелы не допускаются',
    type: 'error' as const,
  },

  required: {
    validate: (value: string) => value.trim().length > 0,
    message: 'Это поле обязательно',
    type: 'error' as const,
  },
};

// Компонент для password strength indicator
interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthProps) {
  const calculateStrength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*]/.test(password)) score++;
    return score;
  };

  const strength = calculateStrength();
  const strengthText = ['Слабый', 'Слабый', 'Средний', 'Средний', 'Сильный', 'Сильный'];
  const strengthColor = [
    'bg-danger',
    'bg-danger',
    'bg-warning',
    'bg-warning',
    'bg-success',
    'bg-success',
  ];

  if (password.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded ${i < strength ? strengthColor[strength - 1] : 'bg-border'}`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium text-${strengthColor[strength - 1]?.replace('bg-', '')}`}>
        Сила пароля: {strengthText[strength - 1]}
      </p>
    </div>
  );
}
