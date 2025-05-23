import React, { useEffect } from "react";
import { Sheet } from "react-modal-sheet";

type SheetsProps = {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
};

const Sheets: React.FC<SheetsProps> = ({ isOpen, onClose, children }) => {
  useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        setTimeout(() => {
          document.body.style.overflow = original;
        }, 300);
      };
    }
  }, [isOpen]);

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      disableDrag={false}
      disableScrollLocking={true}
      className="w-full max-w-4xl mx-auto"
    >
      <Sheet.Container
        className="!bg-neutral-900"
        style={{
          borderTopLeftRadius: "12px",
          borderTopRightRadius: "12px",
          transitionDuration: "100ms",
        }}
      >
        <Sheet.Content>{children}</Sheet.Content>
      </Sheet.Container>
      <Sheet.Backdrop
        onTap={onClose}
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.82)",
        }}
      />
    </Sheet>
  );
};

export default Sheets;
