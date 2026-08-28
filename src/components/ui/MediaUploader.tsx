'use client';

import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  Image as ImageIcon, 
  Video, 
  FileText, 
  X, 
  AlertCircle, 
  Check, 
  Link as LinkIcon,
  Film
} from 'lucide-react';
import { validateMediaFile, META_MEDIA_LIMITS, isValidMediaUrl } from '@/lib/media/validation';
import { Button } from './Button';

export interface MediaUploadValue {
  type: 'image' | 'video' | 'document';
  url: string;
  media_id?: string;    // For regular message sends
  handle?: string;      // For template header_handle (resumable upload)
  filename?: string;
  sizeBytes?: number;
}

export interface MediaUploaderProps {
  mediaType: 'image' | 'video' | 'document';
  value?: MediaUploadValue | null;
  onChange: (val: MediaUploadValue | null) => void;
  required?: boolean;
  purpose?: 'message' | 'template'; // Controls which upload API to use
  label?: string;
}

export function MediaUploader({
  mediaType,
  value,
  onChange,
  required = false,
  purpose = 'message',
  label
}: MediaUploaderProps) {
  const [activeTab, setActiveTab] = useState<'url' | 'file'>('file');
  const [urlInput, setUrlInput] = useState(value?.url || '');
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const limits = META_MEDIA_LIMITS[mediaType];

  const handleUrlSubmit = () => {
    setError(null);
    if (!urlInput.trim()) {
      if (required) setError('Media URL is required.');
      return;
    }

    if (!isValidMediaUrl(urlInput.trim())) {
      setError('Please provide a valid HTTPS URL (e.g. https://your-cdn.com/banner.jpg).');
      return;
    }

    onChange({
      type: mediaType,
      url: urlInput.trim(),
      filename: urlInput.split('/').pop() || `${mediaType}_file`
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateMediaFile(mediaType, file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file format or size.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', purpose); // 'template' uses resumable upload for handle

      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      // Create local blob URL for visual preview only
      const objectUrl = URL.createObjectURL(file);

      onChange({
        type: mediaType,
        url: objectUrl,
        media_id: data.media_id,  // for regular messages
        handle: data.handle,       // for template header_handle
        filename: file.name,
        sizeBytes: file.size
      });
    } catch (err: any) {
      setError(err.message || 'Error uploading file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    onChange(null);
    setUrlInput('');
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          {label || `Template Media Header (${mediaType.toUpperCase()})`} {required && '*'}
        </label>
        <span className="text-[11px] text-[#7C756D] font-medium">
          Max {limits.maxSizeMB}MB • {limits.acceptedExtensions.join(', ')}
        </span>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {value?.url || value?.media_id || value?.handle ? (
        /* Preview Card */
        <div className={`relative rounded-2xl border overflow-hidden group ${(value.handle || value.media_id) ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}`}>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${(value.handle || value.media_id) ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                {(value.handle || value.media_id) ? <Check className="w-5 h-5" /> : (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-600" />
                )}
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-bold truncate ${(value.handle || value.media_id) ? 'text-emerald-800' : 'text-amber-800'}`}>
                  {(value.handle || value.media_id) ? '✅ Uploaded to Meta — Ready!' : '⏳ Uploading to Meta, please wait...'}
                </p>
                <p className="text-[10px] font-mono truncate text-[#9E968D]">
                  {value.handle ? `Handle ready (${value.filename || 'image'})` : value.media_id ? `Media ID: ${value.media_id}` : value.filename || 'Processing...'}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRemove}
              leftIcon={<X className="w-3.5 h-3.5 text-rose-500" />}
              className="hover:bg-rose-50 hover:border-rose-200"
            >
              Remove
            </Button>
          </div>

          {/* Media Preview Box */}
          {mediaType === 'image' && value.url && (
            <div className="h-44 bg-[#F2ECE0]/5 border-t border-slate-200 flex items-center justify-center overflow-hidden">
              <img
                src={value.url}
                alt="Template media preview"
                className="h-full w-full object-cover"
                onError={() => {}}
              />
            </div>
          )}
        </div>
      ) : (
        /* Upload / URL Input Station */
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 shadow-xs">
          {/* Tabs */}
          <div className="flex bg-slate-100/80 p-1 rounded-xl w-max">
            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'url' ? 'bg-white text-indigo-600 shadow-xs' : 'text-[#9E968D] hover:text-slate-700'
              }`}
            >
              Public HTTPS URL
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('file')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'file' ? 'bg-white text-indigo-600 shadow-xs' : 'text-[#9E968D] hover:text-slate-700'
              }`}
            >
              Upload Local File
            </button>
          </div>

          {activeTab === 'url' ? (
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder={`https://your-domain.com/assets/${mediaType === 'image' ? 'banner.png' : mediaType === 'video' ? 'promo.mp4' : 'catalog.pdf'}`}
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
              <Button size="sm" type="button" onClick={handleUrlSubmit}>
                Attach
              </Button>
            </div>
          ) : (
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed ${uploading ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20'} rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2`}
            >
              {uploading ? (
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600"></div>
              ) : (
                <UploadCloud className="w-7 h-7 text-[#7C756D]" />
              )}
              <p className="text-xs font-bold text-slate-700">{uploading ? 'Uploading to Meta...' : `Click to select ${mediaType}`}</p>
              <p className="text-[10px] text-[#7C756D]">Supported: {limits.acceptedExtensions.join(', ')} (Max {limits.maxSizeMB}MB)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept={limits.acceptedMimeTypes.join(',')}
                onChange={handleFileChange}
                className="hidden"
                disabled={uploading}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
