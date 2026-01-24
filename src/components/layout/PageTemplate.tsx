import React from "react";
import AppLayout from "../layout/AppLayout";
import ProtectedLayout from "../layout/ProtectedLayout";

interface PageTemplateProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  showNavbar?: boolean;
  className?: string;
  isLoading?: boolean;
  loadingFallback?: React.ReactNode;
}

const PageTemplate: React.FC<PageTemplateProps> = ({ 
  children, 
  requireAuth = true, 
  showNavbar = true,
  className,
  isLoading = false,
  loadingFallback,
}) => {
  const resolvedChildren = isLoading
    ? loadingFallback ?? (
        <div className="w-full h-[85vh] bg-neutral-800 animate-pulse"></div>
      )
    : children;

  if (requireAuth) {
    return (
      <ProtectedLayout>
        <AppLayout showNavbar={showNavbar} className={className}>
          {resolvedChildren}
        </AppLayout>
      </ProtectedLayout>
    );
  }

  return (
    <AppLayout showNavbar={showNavbar} className={className}>
      {resolvedChildren}
    </AppLayout>
  );
};

export default PageTemplate;