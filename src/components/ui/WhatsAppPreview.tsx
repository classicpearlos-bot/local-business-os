import React from 'react';
import { Check, CheckCheck, Video, FileText, Download, ExternalLink, Phone } from 'lucide-react';

export interface WhatsAppPreviewProps {
  headerType?: 'text' | 'image' | 'video' | 'document' | 'none';
  headerContent?: string; // Text or Media URL
  headerFilename?: string;
  bodyText: string;
  footerText?: string;
  variables?: Record<string, string>; // e.g. { '1': 'John', '2': 'SUMMER20' }
  buttons?: Array<{ type: string; text: string; url?: string; phone_number?: string }>;
  time?: string;
  status?: 'sent' | 'delivered' | 'read';
}

export function WhatsAppPreview({
  headerType = 'none',
  headerContent,
  headerFilename,
  bodyText,
  footerText,
  variables = {},
  buttons = [],
  time = '12:00 PM',
  status = 'read'
}: WhatsAppPreviewProps) {
  // Replace {{1}}, {{2}} with provided sample variable values or highlighted badges
  let interpolatedBody = bodyText;
  Object.entries(variables).forEach(([key, val]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    interpolatedBody = interpolatedBody.replace(regex, val || `{{${key}}}`);
  });

  return (
    <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border border-slate-300 bg-[#efeae2] select-none">
      {/* WhatsApp Header Bar */}
      <div className="bg-[#075e54] text-white px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white shadow-xs">
          WA
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold leading-none truncate">Your Business Name</p>
          <p className="text-[10px] text-emerald-200 mt-0.5 font-medium">Official Business Account</p>
        </div>
      </div>

      {/* Chat Canvas with Wallpaper */}
      <div className="p-4 wa-chat-bg min-h-[260px] flex flex-col justify-end space-y-2">
        <div className="bg-white rounded-2xl rounded-tr-none shadow-sm max-w-[95%] self-end border border-slate-200/60 overflow-hidden">
          
          {/* Media Header Preview */}
          {headerType === 'image' && headerContent && (
            <div className="h-40 bg-slate-100 overflow-hidden border-b border-slate-100">
              <img
                src={headerContent}
                alt="Header Media"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          )}

          {headerType === 'video' && (
            <div className="h-36 bg-[#F2ECE0] flex flex-col items-center justify-center text-[#7C756D] border-b border-[#EFE3CF]">
              <Video className="w-8 h-8 mb-1 text-[#9E968D]" />
              <span className="text-[10px] font-semibold">Video Message Header</span>
            </div>
          )}

          {headerType === 'document' && (
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 truncate">
                  {headerFilename || 'Document_Attachment.pdf'}
                </p>
                <p className="text-[9px] text-[#7C756D] font-medium">PDF Document</p>
              </div>
              <Download className="w-4 h-4 text-[#7C756D]" />
            </div>
          )}

          {headerType === 'text' && headerContent && (
            <div className="px-3.5 pt-3 pb-1 text-xs font-extrabold text-slate-900">
              {headerContent}
            </div>
          )}

          {/* Body Content */}
          <div className="p-3.5 space-y-2">
            <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
              {interpolatedBody || 'Select a pre-approved Meta template to preview campaign content.'}
            </p>

            {footerText && (
              <p className="text-[10px] text-[#7C756D] font-medium">
                {footerText}
              </p>
            )}

            {/* Timestamp & Ticks */}
            <div className="flex items-center justify-end gap-1 pt-1 text-[10px] text-[#7C756D] font-medium">
              <span>{time}</span>
              {status === 'read' ? (
                <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
              ) : status === 'delivered' ? (
                <CheckCheck className="w-3.5 h-3.5 text-[#7C756D]" />
              ) : (
                <Check className="w-3.5 h-3.5 text-[#7C756D]" />
              )}
            </div>
          </div>
        </div>

        {/* Buttons / Quick Replies */}
        {buttons.length > 0 && (
          <div className="space-y-1 max-w-[95%] self-end w-full">
            {buttons.map((btn, idx) => (
              <div
                key={idx}
                className="bg-white/95 text-sky-600 text-xs font-semibold py-2 px-3 rounded-xl text-center shadow-xs border border-slate-200/60 flex items-center justify-center gap-1.5"
              >
                {btn.url && <ExternalLink className="w-3 h-3" />}
                {btn.phone_number && <Phone className="w-3 h-3" />}
                <span>{btn.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
