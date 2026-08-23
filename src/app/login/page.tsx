import Link from "next/link";
import { MessageSquare, ShieldCheck, Zap, Phone, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Left Feature Billboard (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0B0F17] text-white p-12 flex-col justify-between relative overflow-hidden border-r border-slate-800">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <MessageSquare className="w-6 h-6" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-white">NexChat</span>
          </div>

          <h2 className="text-4xl font-extrabold tracking-tight leading-tight mb-4">
            Next-generation WhatsApp Business communication.
          </h2>
          <p className="text-slate-400 text-base max-w-md font-medium leading-relaxed mb-8">
            Connect directly to Meta WhatsApp Cloud API without third-party BSP middleman fees.
          </p>

          <div className="space-y-4 max-w-md">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold text-slate-200">Zero per-message BSP markups</span>
            </div>
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold text-slate-200">Multi-agent team inbox & assignment</span>
            </div>
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold text-slate-200">High-concurrency broadcast queue</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500 font-medium relative z-10">
          © 2026 NexChat Platform. Protected by Supabase Row-Level Security.
        </p>
      </div>

      {/* Right Login Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-6 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Sign in to workspace</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Don't have an account?{" "}
              <Link href="/signup" className="font-bold text-indigo-600 hover:text-indigo-700">
                Create new workspace
              </Link>
            </p>
          </div>

          <form className="space-y-4" action="/api/auth/login" method="POST">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Work Email
              </label>
              <input
                name="email"
                type="email"
                required
                placeholder="you@company.com"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                name="password"
                type="password"
                required
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm shadow-indigo-600/20 transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
