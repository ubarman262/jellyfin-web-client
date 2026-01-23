import React from "react";
import AppLayout from "../layout/AppLayout";
import ProtectedLayout from "../layout/ProtectedLayout";

interface PageTemplateProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  showNavbar?: boolean;
  className?: string;
}

const PageTemplate: React.FC<PageTemplateProps> = ({ 
  children, 
  requireAuth = true, 
  showNavbar = true,
  className 
}) => {
  if (requireAuth) {
    return (
      <ProtectedLayout>
        <AppLayout showNavbar={showNavbar} className={className}>
          {children}
        </AppLayout>
      </ProtectedLayout>
    );
  }

  return (
    <AppLayout showNavbar={showNavbar} className={className}>
      {children}
    </AppLayout>
  );
};

export default PageTemplate;