"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { ReactNode } from "react";

type ModalProps = {
  children: ReactNode;
  onClose: () => void;
  overlayClassName?: string;
  contentClassName?: string;
};

export default function Modal({
  children,
  onClose,
  overlayClassName,
  contentClassName,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className={
        overlayClassName ? `modal-overlay ${overlayClassName}` : "modal-overlay"
      }
      onClick={onClose}
    >
      <div
        className={
          contentClassName
            ? `modal-content ${contentClassName}`
            : "modal-content"
        }
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.getElementById("modal-root")!,
  );
}
