import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function Card({ hover = false, className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`card-luxury text-[#1E1B18] ${
        hover ? 'hover:border-[#DFBE7E] hover:-translate-y-0.5 cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className = '', children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`text-base sm:text-lg font-bold text-slate-900 tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className = '', children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-xs text-slate-500 font-normal mt-0.5 ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-5 sm:p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 rounded-b-2xl flex items-center justify-between ${className}`} {...props}>
      {children}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: any;
  iconBg?: string;
  iconColor?: string;
  description?: string;
}

export function StatCard({ 
  title, 
  value, 
  subtitle,
  change, 
  trend = 'up', 
  icon, 
  iconBg = 'bg-amber-50 text-amber-600 border border-amber-200/60', 
  iconColor,
  description 
}: StatCardProps) {
  let renderedIcon = null;
  if (React.isValidElement(icon)) {
    renderedIcon = icon;
  } else if (typeof icon === 'function' || (icon && typeof icon === 'object' && ('$$typeof' in icon || 'render' in icon))) {
    renderedIcon = React.createElement(icon, { className: `w-5 h-5 ${iconColor || ''}` });
  }

  return (
    <div className="card-luxury p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 transition-all duration-200">
      {/* Top row: Title and 3-dots */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
        <span className="uppercase tracking-wider text-[11px] font-bold text-slate-500">{title}</span>
        <span className="text-slate-300 group-hover:text-slate-500 transition-colors cursor-pointer">•••</span>
      </div>

      {/* Main Metric Value & Icon */}
      <div className="flex items-center justify-between my-3">
        <div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{value}</h3>
          {subtitle && (
            <p className="text-xs text-slate-500 font-medium mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-xs transition-transform duration-300 group-hover:scale-105 ${iconBg}`}>
          {renderedIcon}
        </div>
      </div>

      {/* Bottom Trend */}
      {change && (
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
          <span>{change}</span>
        </div>
      )}

      {description && (
        <p className="text-[11px] text-slate-500 mt-1 font-medium">{description}</p>
      )}

      {/* Subtle bottom indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent group-hover:via-amber-500/70 transition-all" />
    </div>
  );
}
