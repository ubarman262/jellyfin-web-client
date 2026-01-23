import React from "react";
import Navbar from "./Navbar";

interface AppLayoutProps {
  children: React.ReactNode;
  showNavbar?: boolean;
  className?: string;
}

const AppLayout: React.FC<AppLayoutProps> = ({ 
  children, 
  showNavbar = true, 
  className = "min-h-screen bg-neutral-900 text-white" 
}) => {
  return (
    <div className={className}>
      {showNavbar && <Navbar />}
      {children}
    </div>
  );
};

export default AppLayout;