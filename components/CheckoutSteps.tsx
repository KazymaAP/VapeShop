/**
 * Компонент для визуализации шагов оформления заказа
 */

interface CheckoutStep {
  id: string;
  label: string;
  icon: string;
}

interface CheckoutStepsProps {
  steps: CheckoutStep[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  className?: string;
}

export function CheckoutSteps({
  steps,
  currentStep,
  onStepClick,
  className = '',
}: CheckoutStepsProps) {
  return (
    <div className={`${className}`}>
      {/* Desktop view */}
      <div className="hidden md:block">
        <div className="flex items-center">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="flex-1 flex items-center"
              onClick={() => onStepClick?.(index)}
            >
              {/* Step circle */}
              <div
                className={`
                  flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-semibold transition
                  ${
                    index < currentStep
                      ? 'bg-success text-white'
                      : index === currentStep
                      ? 'bg-neon text-bgDark'
                      : 'bg-border text-textSecondary'
                  }
                  ${onStepClick && index <= currentStep ? 'cursor-pointer hover:shadow-lg' : ''}
                `}
              >
                {index < currentStep ? '✓' : step.icon}
              </div>

              {/* Label */}
              <div className="ml-3">
                <p
                  className={`
                    text-sm font-medium transition
                    ${
                      index <= currentStep
                        ? 'text-textPrimary'
                        : 'text-textSecondary'
                    }
                  `}
                >
                  {step.label}
                </p>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-1 mx-2 bg-border">
                  {index < currentStep && (
                    <div className="h-full bg-success" />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile view */}
      <div className="md:hidden">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="flex-shrink-0 flex flex-col items-center"
              onClick={() => onStepClick?.(index)}
            >
              {/* Step circle */}
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs transition
                  ${
                    index < currentStep
                      ? 'bg-success text-white'
                      : index === currentStep
                      ? 'bg-neon text-bgDark'
                      : 'bg-border text-textSecondary'
                  }
                  ${onStepClick && index <= currentStep ? 'cursor-pointer' : ''}
                `}
              >
                {index < currentStep ? '✓' : step.icon}
              </div>

              {/* Label */}
              <p
                className={`
                  text-xs font-medium mt-1 whitespace-nowrap transition
                  ${
                    index <= currentStep
                      ? 'text-textPrimary'
                      : 'text-textSecondary'
                  }
                `}
              >
                {step.label}
              </p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-neon transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Predefined checkout steps
export const CHECKOUT_STEPS = [
  { id: 'cart', label: 'Корзина', icon: '🛒' },
  { id: 'address', label: 'Адрес', icon: '📍' },
  { id: 'payment', label: 'Оплата', icon: '💳' },
  { id: 'confirmation', label: 'Готово', icon: '✓' },
];
