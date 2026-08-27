'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { 
  Image as ImageIcon, 
  Video, 
  FileText, 
  UploadCloud, 
  Search, 
  Plus, 
  ExternalLink, 
  Trash2, 
  Megaphone,
  LayoutGrid,
  List,
  Sparkles,
  Check
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { MediaUploader, MediaUploadValue } from "@/components/ui/MediaUploader";

export default function MediaLibraryPage() {
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'image' | 'video' | 'document'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newMediaValue, setNewMediaValue] = useState<MediaUploadValue | null>(null);
  const [uploadType, setUploadType] = useState<'image' | 'video' | 'document'>('image');
  const [mediaTitle, setMediaTitle] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/media')
      .then(res => res.json())
      .then(data => {
        if (data.media) setMediaList(data.media);
      })
      .catch(console.error);
  }, []);

  const handleSaveMedia = () => {
    if (!newMediaValue) return;

    const newAsset = {
      id: `media_${Date.now()}`,
      name: mediaTitle.trim() || newMediaValue.filename || 'Untitled Asset',
      type: newMediaValue.type,
      url: newMediaValue.url,
      size_bytes: newMediaValue.sizeBytes || 150000,
      created_at: new Date().toISOString()
    };

    setMediaList([newAsset, ...mediaList]);
    setShowUploadModal(false);
    setNewMediaValue(null);
    setMediaTitle('');
  };

  const filteredMedia = mediaList.filter(m => {
    if (filter !== 'all' && m.type !== filter) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex h-screen bg-[#070A12]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          title="Media Library"
          subtitle="Reusable marketing assets, banners, product videos, and catalogs for WhatsApp campaigns."
          badge={<Badge variant="primary">{mediaList.length} Assets</Badge>}
          actions={
            <Button
              onClick={() => {
                setNewMediaValue(null);
                setMediaTitle('');
                setShowUploadModal(true);
              }}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Media Asset
            </Button>
          }
        />

        <main className="flex-1 overflow-y-auto p-8 lg:p-10 space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Filter Pills */}
            <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
              {(['all', 'image', 'video', 'document'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                    filter === t ? 'bg-[#0D131F] text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t === 'all' ? `All (${mediaList.length})` : `${t}s`}
                </button>
              ))}
            </div>

            {/* Search & Layout Toggle */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-[#0D131F] border border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>

              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'grid' ? 'bg-[#0D131F] text-indigo-600 shadow-xs' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'list' ? 'bg-[#0D131F] text-indigo-600 shadow-xs' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filteredMedia.map((asset) => (
                <div
                  key={asset.id}
                  className="rounded-2xl border border-slate-800 bg-[#0D131F] overflow-hidden shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
                >
                  {/* Thumbnail */}
                  <div className="h-44 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                    {asset.type === 'image' && (
                      <img src={asset.url} alt={asset.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    )}
                    {asset.type === 'video' && (
                      <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
                        <Video className="w-8 h-8 text-indigo-600" />
                        <span className="text-[10px] font-bold">Video Asset</span>
                      </div>
                    )}
                    {asset.type === 'document' && (
                      <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
                        <FileText className="w-8 h-8 text-rose-500" />
                        <span className="text-[10px] font-bold">Document Asset</span>
                      </div>
                    )}

                    <div className="absolute top-2 right-2">
                      <Badge variant={asset.type === 'image' ? 'primary' : asset.type === 'video' ? 'info' : 'warning'}>
                        {asset.type.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  {/* Asset Details */}
                  <div className="p-4 space-y-3">
                    <div>
                      <p className="text-xs font-bold text-white truncate">{asset.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {Math.round((asset.size_bytes || 150000) / 1024)} KB • {new Date(asset.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <a
                        href={asset.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> View
                      </a>

                      <Link href="/campaigns">
                        <Button variant="primary" size="sm" className="text-[11px] py-1 px-2.5">
                          Use in Campaign
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <Card className="overflow-hidden">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#0B0F19] border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-6 py-4">Asset Name</th>
                    <th className="px-6 py-4">Format</th>
                    <th className="px-6 py-4">Size</th>
                    <th className="px-6 py-4">Created Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium text-slate-700">
                  {filteredMedia.map((asset) => (
                    <tr key={asset.id} className="hover:bg-[#0B0F19]/80">
                      <td className="px-6 py-4 font-bold text-white text-xs">
                        {asset.name}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={asset.type === 'image' ? 'primary' : asset.type === 'video' ? 'info' : 'warning'}>
                          {asset.type.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">
                        {Math.round((asset.size_bytes || 150000) / 1024)} KB
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {new Date(asset.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href="/campaigns">
                          <Button variant="outline" size="sm">
                            Use in Campaign
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {filteredMedia.length === 0 && (
            <EmptyState
              icon={ImageIcon}
              title="No media assets found"
              description="Upload banners, flyers, and catalogs to reuse across all your WhatsApp marketing broadcasts."
              actionLabel="Upload Media Asset"
              onAction={() => setShowUploadModal(true)}
              actionIcon={<Plus className="w-4 h-4" />}
            />
          )}
        </main>
      </div>

      {/* Add Media Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Add Marketing Media Asset"
        description="Store reusable image banners, videos, or PDF catalogs for your broadcasts."
      >
        <div className="space-y-4">
          <Input
            label="Asset Title / Internal Name *"
            placeholder="e.g. Summer Festival 2026 Banner"
            value={mediaTitle}
            onChange={(e) => setMediaTitle(e.target.value)}
          />

          <div className="flex bg-slate-100 p-1 rounded-xl">
            {(['image', 'video', 'document'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setUploadType(t)}
                className={`flex-1 py-1.5 text-xs font-bold capitalize rounded-lg transition-all ${
                  uploadType === t ? 'bg-[#0D131F] text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <MediaUploader
            mediaType={uploadType}
            value={newMediaValue}
            onChange={(val) => setNewMediaValue(val)}
            required={true}
          />

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setShowUploadModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!newMediaValue}
              onClick={handleSaveMedia}
              leftIcon={<Check className="w-4 h-4" />}
            >
              Save to Library
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
