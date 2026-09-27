import React, { useState, useRef } from 'react';
import { Upload, X, RefreshCw, User, Image as ImageIcon } from 'lucide-react';

interface PhotoUploadProps {
  value?: string;
  onChange: (dataUrl: string) => void;
  onRemove: () => void;
  error?: string;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  value,
  onChange,
  onRemove,
  error,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setUploadError(null);
    // Validate format
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Please upload a valid image file (JPG, JPEG, or PNG).');
      return;
    }

    // Limit size to 4MB for fast uploading and clean base64 storage
    if (file.size > 4 * 1024 * 1024) {
      setUploadError('Image size exceeds 4MB. Please upload a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const rawDataUrl = reader.result;
        // Optimize and compress photo to ensure crisp display and safe Firestore storage
        const img = new Image();
        img.onload = () => {
          const maxDim = 400;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const optimized = canvas.toDataURL('image/jpeg', 0.85);
            onChange(optimized);
          } else {
            onChange(rawDataUrl);
          }
        };
        img.onerror = () => {
          onChange(rawDataUrl);
        };
        img.src = rawDataUrl;
      }
    };
    reader.onerror = () => {
      setUploadError('Failed to read image file. Please try another image.');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div id="photo-upload-container" className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-semibold text-slate-800">
            Upload Your Photo
          </label>
          <p className="text-xs text-slate-500">
            Add a recent clear photograph (JPG, JPEG, PNG, max 4MB)
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        id="photo-file-input"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleFileInput}
      />

      {!value ? (
        <div
          id="photo-dropzone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`group relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-[#0066A6] bg-[#EBF4FA]'
              : 'border-slate-300 hover:border-[#0066A6] bg-slate-50/70 hover:bg-white'
          }`}
        >
          <div className="w-14 h-14 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-[#0066A6] group-hover:scale-105 transition-transform">
            <Upload className="w-6 h-6" />
          </div>
          <p className="mt-3 text-sm font-medium text-slate-700">
            <span className="text-[#0066A6] font-semibold underline underline-offset-2">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Accepts JPG, JPEG, and PNG
          </p>
        </div>
      ) : (
        <div
          id="photo-preview-card"
          className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-xs"
        >
          <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
            <img
              src={value}
              alt="Uploaded Student"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">
              Photo Uploaded Successfully
            </p>
            <p className="text-xs text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
              Ready for counselling review
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                id="btn-replace-photo"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Replace
              </button>
              <button
                type="button"
                id="btn-remove-photo"
                onClick={onRemove}
                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {(uploadError || error) && (
        <p className="text-xs text-rose-600 font-medium">
          {uploadError || error}
        </p>
      )}
    </div>
  );
};
