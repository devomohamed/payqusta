import React from 'react';

export default function PortalCard({
    children,
    className = '',
    onClick,
    hover = false,
    padding = 'p-4',
    ...props
}) {
    const baseClasses = "app-surface rounded-2xl border border-gray-100/80 shadow-sm transition-all dark:border-white/10";
    const hoverClasses = hover
        ? "cursor-pointer hover:-translate-y-0.5 hover:border-primary-500/40 hover:shadow-lg hover:shadow-primary-500/10 dark:hover:border-primary-500/30"
        : "";

    return (
        <div
            className={`${baseClasses} ${hoverClasses} ${padding} ${className}`}
            onClick={onClick}
            {...props}
        >
            {children}
        </div>
    );
}
