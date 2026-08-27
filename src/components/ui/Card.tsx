import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function Card({ hover = false, className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`bg-[#0D131F]/90 backdrop-blur-xl rounded-2xl border border-slate-800/80 text-slate-100 shadow-lg shadow-black/20 ${
        hover ? 'hover:border-indigo-500/40 hover:shadow-indigo-500/10 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-5 sm:p-6 border-b border-slate-800/80 flex items-center justify-between ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className = '', children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`text-lg font-black text-white tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className = '', children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-xs sm:text-sm text-slate-400 font-medium mt-0.5 ${className}`} {...props}>
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
    <div className={`p-5 sm:p-6 border-t border-slate-800/80 bg-slate-900/40 rounded-b-2xl flex items-center justify-between ${className}`} {...props}>
      {children}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  trendPositive?: boolean;
  iconColor?: string;
  iconBg?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendPositive = true,
  iconColor = 'text-indigo-400',
  iconBg = 'bg-indigo-950/80 border-indigo-800/50'
}: StatCardProps) {
  return (
    <Card hover className="p-5 sm:p-6 relative overflow-hidden group">
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-md ${iconBg} ${iconColor} group-hover:scale-105 transition-transform`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
            trendPositive ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60' : 'bg-rose-950/80 text-rose-300 border-rose-800/60'
          }`}>
            {trend}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">{title}</p>
        <p className="text-3xl font-black text-white tracking-tight mt-1">{value}</p>
        {subtitle && (
          <p className="text-xs text-slate-400 font-medium mt-1">{subtitle}</p>
        )}
      </div>
    </Card>
  );
}
