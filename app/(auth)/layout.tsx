import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-um-blue via-um-blue-light to-um-blue">
      {/* Top bar */}
      <div className="flex items-center justify-center pt-8 pb-4">
        <Link href="/" className="flex items-center gap-0.5">
          <span className="text-maize font-bold text-2xl tracking-tight">Maize</span>
          <span className="text-white font-bold text-2xl tracking-tight">Market</span>
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>

      {/* Footer */}
      <div className="pb-6 text-center">
        <p className="text-white/40 text-xs">
          University of Michigan students only · Not affiliated with the University
        </p>
      </div>
    </div>
  );
}
