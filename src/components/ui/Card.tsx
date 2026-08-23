import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function Card({ hover = false, className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/80 shadow-xs ${
        hover ? 'card-subtle-glow cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-6 border-b border-slate-100 flex items-center justify-between ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className = '', children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`text-lg font-bold text-slate-900 tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className = '', children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-sm text-slate-500 font-medium mt-0.5 ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-6 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex items-center justify-between ${className}`} {...props}>
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
  iconColor = 'text-indigo-600',
  iconBg = 'bg-indigo-50 border-indigo-100/80'
}: StatCardProps) {
  return (
    <Card hover className="p-6">
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${iconBg} ${iconColor}`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${
            trendPositive ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-rose-50 text-rose-700 border-rose-200/60'
          }`}>
            {trend}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
        <p className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">{value}</p>
        {subtitle && (
          <p className="text-xs text-slate-500 font-medium mt-1">{subtitle}</p>
        )}
      </div>
    </Card>
  );
}
