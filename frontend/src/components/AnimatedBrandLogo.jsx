import React from 'react';

const AnimatedBrandLogo = ({
    src, // Keep for backward compatibility but ignore it
    alt = "Brand Logo",
    className = "",
    containerClassName = "",
    size = "md" // sm, md, lg, xl, full
}) => {
    // Determine size classes
    const sizeClasses = {
        sm: "w-8 h-8",
        md: "w-12 h-12",
        lg: "w-24 h-24",
        xl: "w-32 h-32 text-8xl",
        "2xl": "w-40 h-40 text-9xl",
        full: "w-full h-full"
    };

    const selectedSize = sizeClasses[size] || sizeClasses.md;

    return (
        <div className={`relative group inline-block animate-logo-float ${containerClassName}`}>
            {/* Glowing background effect */}
            <div className="absolute -inset-2 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 rounded-3xl blur-[12px] opacity-40 group-hover:opacity-75 transition duration-1000 group-hover:duration-300 animate-pulse-soft"></div>

            {/* Container for the SVG */}
            <div className={`relative flex items-center justify-center overflow-hidden ${selectedSize}`}>
                {/* 
                    SVG Logo: "PQ" intertwined with a subtle money/receipt background element
                    The logo matches the vibrant blue-to-purple gradient aesthetic.
                */}
                <svg
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={`w-full h-full drop-shadow-2xl animate-logo-glow ${className}`}
                >
                    <defs>
                        {/* Vibrant Gradient for the "PQ" text */}
                        <linearGradient id="pq-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#38bdf8" /> {/* Cyan */}
                            <stop offset="50%" stopColor="#818cf8" /> {/* Indigo */}
                            <stop offset="100%" stopColor="#c084fc" /> {/* Purple */}
                        </linearGradient>

                        {/* Metallic / Glass sheen for the money backdrop */}
                        <linearGradient id="receipt-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#3b0764" stopOpacity="0.8" />
                        </linearGradient>

                        <filter id="glow">
                            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Background: Receipt / Money Element with torn bottom edge */}
                    <path
                        d="M 50 20 L 85 20 L 85 65 Q 80 65 75 70 Q 70 65 65 70 Q 60 65 55 70 Q 50 65 45 70 L 45 35 Z"
                        fill="url(#receipt-gradient)"
                        stroke="url(#pq-gradient)"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                        className="opacity-90"
                    />

                    {/* Money dot/circle detail on the right */}
                    <circle cx="75" cy="45" r="4" fill="url(#pq-gradient)" className="opacity-80" />

                    {/* "P" Letter: Curved thick line extending down and forming the loop */}
                    <path
                        d="M 25 80 L 25 35 C 25 25 45 25 45 35 C 45 45 25 45 25 45"
                        stroke="url(#pq-gradient)"
                        strokeWidth="9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                        filter="url(#glow)"
                        className="drop-shadow-lg"
                    />

                    {/* "Q" Letter: Overlapping circle with a sharp tail intersecting the "P" */}
                    <circle
                        cx="50"
                        cy="45"
                        r="12"
                        stroke="url(#pq-gradient)"
                        strokeWidth="8"
                        fill="none"
                        filter="url(#glow)"
                    />

                    {/* The tail of the "Q" extending downwards like a lightning bolt/chat bubble */}
                    <path
                        d="M 55 52 L 65 65 L 45 80 L 52 65 Z"
                        fill="url(#pq-gradient)"
                        filter="url(#glow)"
                    />

                    {/* Inner horizontal dash inside the "Q" to give it that tech/speed feel */}
                    <line x1="45" y1="45" x2="55" y2="45" stroke="url(#pq-gradient)" strokeWidth="4" strokeLinecap="round" />
                </svg>

                {/* Shining sweep effect over the SVG */}
                <div className="logo-shine-effect z-10 opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
        </div>
    );
};

export default AnimatedBrandLogo;
