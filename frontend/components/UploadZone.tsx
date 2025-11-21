"use client";

import { useState, useRef } from "react";
import { Upload } from "lucide-react";
import clsx from "clsx";

interface UploadZoneProps {
  onUpload: (file: File) => void;
  isUploading: boolean;
}

export default function UploadZone({ onUpload, isUploading }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <div
      className={clsx(
        "relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl transition-colors duration-300 ease-in-out",
        dragActive
          ? "border-blue-500 bg-blue-50"
          : "border-gray-300 bg-white hover:bg-gray-50",
        isUploading && "opacity-50 pointer-events-none"
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="video/*"
        onChange={handleChange}
      />

      <div className="flex flex-col items-center gap-4 text-center p-6">
        <div className="p-4 bg-blue-100 rounded-full text-blue-600">
          {isUploading ? (
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
          ) : (
            <Upload className="w-8 h-8" />
          )}
        </div>

        <div className="space-y-1">
          <p className="text-lg font-semibold text-gray-700">
            {isUploading ? "Analyzing Video..." : "Upload Video to Analyze"}
          </p>
          <p className="text-sm text-gray-500">
            Drag and drop or{" "}
            <span
              className="text-blue-500 cursor-pointer hover:underline"
              onClick={onButtonClick}
            >
              browse
            </span>
          </p>
        </div>

        <div className="text-xs text-gray-400">
          Supports MP4, MOV, WEBM (max 500 MB / ~10 min)
        </div>
      </div>
    </div>
  );
}
