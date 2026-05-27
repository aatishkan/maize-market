import Link from 'next/link';
import { Mail, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Check your email',
};

interface Props {
  searchParams: Promise<{ email?: string }>;
}

export default async function VerifyPage({ searchParams }: Props) {
  const { email } = await searchParams;

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6 text-center">
      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-um-blue-muted">
          <Mail className="h-8 w-8 text-um-blue" />
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Check your inbox</h1>
        <p className="text-sm text-muted-foreground">
          We've sent a verification link to{' '}
          {email ? (
            <span className="font-medium text-foreground">{email}</span>
          ) : (
            'your email'
          )}
          .
        </p>
        <p className="text-sm text-muted-foreground">
          Click the link to verify your account and start browsing.
        </p>
      </div>

      <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-left">
        <p className="text-xs text-amber-800 font-medium">Didn't get it?</p>
        <p className="text-xs text-amber-700 mt-0.5">
          Check your spam folder. The link expires in 24 hours.
        </p>
      </div>

      <Link
        href="/register"
        className={cn(buttonVariants({ variant: 'ghost' }), 'text-muted-foreground')}
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to sign up
      </Link>
    </div>
  );
}
