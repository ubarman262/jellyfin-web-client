import React from "react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = "md", 
  className = "",
  text 
}) => {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16"
  };

  return (
    <div className={`flex items-center justify-center h-screen bg-black ${className}`}>
      <div className="flex flex-col items-center gap-4">
        <div className={`animate-spin rounded-full border-t-2 border-b-2 border-red-600 ${sizeClasses[size]}`}></div>
        {text && <p className="text-white text-sm">{text}</p>}
      </div>
    </div>
  );
};

export default LoadingSpinner;