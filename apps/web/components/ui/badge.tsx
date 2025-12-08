import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'success' | 'warning' | 'error';
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
    ({ className = "", variant = 'default', children, ...props }, ref) => {
        const variantStyles = {
            default: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
            success: 'bg-green-500/20 text-green-300 border-green-500/30',
            warning: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
            error: 'bg-red-500/20 text-red-300 border-red-500/30',
        };

        return (
            <div
                ref={ref}
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${variantStyles[variant]} ${className}`}
                {...props}
            >
                {children}
            </div>
        );
    }
);
Badge.displayName = "Badge";

export { Badge };
