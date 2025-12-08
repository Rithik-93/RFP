import * as React from "react";

const Card = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className = "", children, ...props }, ref) => (
    <div
        ref={ref}
        className={`rounded-xl border border-purple-500/20 bg-black/40 backdrop-blur-sm text-purple-100 shadow-lg ${className}`}
        {...props}
    >
        {children}
    </div>
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className = "", children, ...props }, ref) => (
    <div
        ref={ref}
        className={`flex flex-col space-y-1.5 p-6 ${className}`}
        {...props}
    >
        {children}
    </div>
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className = "", children, ...props }, ref) => (
    <h3
        ref={ref}
        className={`text-2xl font-semibold leading-none tracking-tight text-purple-200 ${className}`}
        {...props}
    >
        {children}
    </h3>
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className = "", children, ...props }, ref) => (
    <p
        ref={ref}
        className={`text-sm text-purple-300/70 ${className}`}
        {...props}
    >
        {children}
    </p>
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className = "", children, ...props }, ref) => (
    <div ref={ref} className={`p-6 pt-0 ${className}`} {...props}>
        {children}
    </div>
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className = "", children, ...props }, ref) => (
    <div
        ref={ref}
        className={`flex items-center p-6 pt-0 ${className}`}
        {...props}
    >
        {children}
    </div>
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
