import { X } from "lucide-react";
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
        className={`absolute inset-0 bg-white transition-opacity duration-500 ${
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
          <div
            className="relative bg-neutral-900 rounded-t-xl shadow-2xl w-full max-w-4xl mx-auto overflow-y-auto scrollbar-hide"
            style={{ maxHeight: 700, marginBottom: 0 }}
          >
            <button
              className="absolute top-4 right-4 z-30 bg-black/60 rounded-full p-2 hover:bg-black/80 transition-colors"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={24} />
            </button>
            <div className="relative w-full aspect-[16/8] bg-black rounded-t-lg overflow-hidden">
              Hello
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RevealModal;
