"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";

type SetUploadedProps = {
  setUploaded: Dispatch<SetStateAction<boolean>>;
};

function ImageUpload({ setUploaded }: SetUploadedProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [] },
    multiple: true,
    maxFiles: 3,
    onDrop: (acceptedFiles) => {
      const urls = acceptedFiles.map((file) => URL.createObjectURL(file));
      setPreviews(urls);
    },
    onDropRejected: (rejections) => {
      console.warn("Rejected files:", rejections);
      setPreviews([]);
    },
  });

  const handleRemove = (indexToRemove: number) => {
    setPreviews((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  useEffect(() => {
    setUploaded(previews.length > 0);
  }, [previews, setUploaded]);

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);
  return (
    <div className="w-full">
      <div
        {...getRootProps({
          className: !isDragActive ? "dropzone" : "dropzone dragged",
        })}
      >
        <input {...getInputProps()} />
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          ></path>
        </svg>
        {isDragActive ? (
          <p>ჩაყარე ფოტოები აქ…</p>
        ) : (
          <p>ჩაყარე ფოტოები ან დააჭირე ასარჩევად (მაქსიმუმ 3 ფოტო)</p>
        )}
      </div>

      {previews.length > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-3 mx-6">
          {previews.map((src, index) => (
            <div key={src} className="relative">
              <button
                type="button"
                onClick={() => handleRemove(index)}
                aria-label={`Remove image ${index + 1}`}
                className="absolute right-1 top-1 text-neutral-800 text-base bg-neutral-300 rounded-full w-6 h-6 text-center"
              >
                x
              </button>
              <img
                src={src}
                alt={`Uploaded preview ${index + 1}`}
                className="h-24 w-full object-cover rounded-xl border-2"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
export default ImageUpload;
