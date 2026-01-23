import React from "react";
import AppLayout from "../layout/AppLayout";

interface ErrorDisplayProps {
  title?: string;
  message?: string;
  showNavbar?: boolean;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ 
  title = "Error", 
  message = "Something went wrong. Please try again later.",
  showNavbar = true
}) => {
  return (
    <AppLayout showNavbar={showNavbar}>
      <div className="pt-16 container mx-auto px-4 py-12">
        <div className="bg-gray-800 p-6 rounded-lg text-center">
          <h2 className="text-2xl font-bold mb-2 text-white">{title}</h2>
          <p className="text-gray-300">{message}</p>
        </div>
      </div>
    </AppLayout>
  );
};

export default ErrorDisplay;