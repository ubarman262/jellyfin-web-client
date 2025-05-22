import React, { useEffect } from "react";

type RevealModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
};

const RevealModal: React.FC<RevealModalProps> = ({
  isOpen,
  onClose,
  children,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [isOpen]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center transition-all duration-500 ${
        isOpen ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-500 ${
          isOpen ? "opacity-60" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Modal content */}
      <div
        className={`relative w-full bg-transparent rounded-t-2xl shadow-lg transform transition-all duration-500 ease-in-out ${
          isOpen ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        }`}
      >
        {children ?? (
          <>
            <h2 className="text-xl font-bold mb-2">I'm a Modal</h2>
            <p className="text-gray-600">Sliding up from the bottom.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default RevealModal;
