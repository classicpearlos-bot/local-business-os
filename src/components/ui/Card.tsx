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
    <div className={`p-5 sm:p-6 border-b border-[#EFE3CF]/70 flex items-center justify-between ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className = '', children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`text-base sm:text-lg font-bold text-[#1E1B18] tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className = '', children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-xs text-[#7C756D] font-medium mt-0.5 ${className}`} {...props}>
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
    <div className={`p-4 sm:p-5 border-t border-[#EFE3CF]/70 bg-[#FAF7F2]/60 rounded-b-2xl flex items-center justify-between ${className}`} {...props}>
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
  iconBg = 'bg-[#FDF4E2] text-[#C59E3F]', 
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
    <div className="card-luxury p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden group">
      {/* Top row: Title and 3-dots */}
      <div className="flex items-center justify-between text-xs font-semibold text-[#7C756D]">
        <span>{title}</span>
        <span className="text-[#C4BCB3] group-hover:text-[#7C756D] transition-colors cursor-pointer">•••</span>
      </div>

      {/* Main Metric Value & Icon */}
      <div className="flex items-center justify-between my-3">
        <div>
          <h3 className="text-2xl sm:text-3xl font-black text-[#1E1B18] tracking-tight">{value}</h3>
          {subtitle && (
            <p className="text-xs text-[#7C756D] font-medium mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-xs ${iconBg}`}>
          {renderedIcon}
        </div>
      </div>

      {/* Bottom Trend */}
      {change && (
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#059669]">
          <span>{change}</span>
        </div>
      )}

      {description && (
        <p className="text-[11px] text-[#7C756D] mt-1 font-medium">{description}</p>
      )}

      {/* Subtle gold bottom wave effect */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-[#EBD4A4]/50 to-transparent" />
    </div>
  );
}
