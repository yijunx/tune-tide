"use client";
import { useState } from "react";
import { Upload, X } from "lucide-react";
import { uploadApi } from "@/services/api";

interface AlbumArtworkUploadProps {
  onUploadSuccess: (fileUrl: string) => void;
  className?: string;
}

export default function AlbumArtworkUpload({ onUploadSuccess, className = "" }: AlbumArtworkUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setError(null);
  };

  const handleUpload = async () => {
    const fileInput = document.getElementById('artwork-file') as HTMLInputElement;
    const file = fileInput.files?.[0];
    
    if (!file) {
      setError('Please select a file first');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      
      const result = await uploadApi.uploadAlbumArtwork(file);
      
      if (result.success) {
        onUploadSuccess(result.fileUrl);
        setPreview(null);
        fileInput.value = '';
      } else {
        setError('Upload failed');
      }
    } catch (err) {
      setError('Upload failed. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const clearSelection = () => {
    const fileInput = document.getElementById('artwork-file') as HTMLInputElement;
    fileInput.value = '';
    setPreview(null);
    setError(null);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-colors">
          <Upload size={16} />
          Select Image
          <input
            id="artwork-file"
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
        
        {preview && (
          <>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
            <button
              onClick={clearSelection}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X size={16} />
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      {preview && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Preview:</p>
          <img
            src={preview}
            alt="Preview"
            className="w-32 h-32 object-cover rounded-lg border"
          />
        </div>
      )}
    </div>
  );
} 