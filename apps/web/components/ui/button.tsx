import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'outline' | 'ghost';
    size?: 'default' | 'sm' | 'lg';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = "", variant = 'default', size = 'default', children, ...props }, ref) => {
        const variantStyles = {
            default: 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-500/20',
            outline: 'border border-purple-500/50 text-purple-300 hover:bg-purple-500/10',
            ghost: 'text-purple-300 hover:bg-purple-500/10 hover:text-purple-200',
        };

        const sizeStyles = {
            default: 'px-4 py-2 text-sm',
            sm: 'px-3 py-1.5 text-xs',
            lg: 'px-6 py-3 text-base',
        };

        return (
            <button
                ref={ref}
                className={`inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
                {...props}
            >
                {children}
            </button>
        );
    }
);
Button.displayName = "Button";

export { Button };
