"use client";

import Modal from "./modal";
import { useEffect } from "react";

type ImageLightboxModalProps = {
  isOpen: boolean;
  imageSrc: string | null;
  imageAlt: string;
  onClose: () => void;
};

export default function ImageLightboxModal({
  isOpen,
  imageSrc,
  imageAlt,
  onClose,
}: ImageLightboxModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    document.body.classList.add("overflow-y-hidden");

    return () => {
      document.body.classList.remove("overflow-y-hidden");
    };
  }, [isOpen]);

  if (!isOpen || !imageSrc) {
    return null;
  }

  return (
    <Modal
      onClose={onClose}
      contentClassName="!w-auto !max-w-[92vw] !bg-transparent !border-0 !p-0"
    >
      <div className="relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close image preview"
          className="absolute -top-10 right-0 h-8 w-8 rounded-full border border-white/60 bg-black/60 text-white"
        >
          <i className="bi bi-x-lg" aria-hidden="true"></i>
        </button>
        <img
          src={imageSrc}
          alt={imageAlt}
          className="max-h-[85vh] max-w-[92vw] rounded-xl border-2 border-white object-contain bg-black/10"
        />
      </div>
    </Modal>
  );
}
