import Link from 'next/link';
import { ShieldCheck, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About — MaizeMarket',
  description:
    'MaizeMarket is a verified UMich-only furniture marketplace. Buy and sell furniture with fellow Wolverines — no strangers, no scams.',
};

interface FeatureCardProps {
  icon: React.ElementType;
  heading: string;
  children: React.ReactNode;
}

function FeatureCard({ icon: Icon, heading, children }: FeatureCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-3">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-um-blue-muted">
        <Icon className="h-5 w-5 text-um-blue" />
      </div>
      <h2 className="text-lg font-bold text-foreground">{heading}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
        {children}
      </div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 space-y-10">

      {/* Hero */}
      <div className="space-y-4">
        <div className="inline-block rounded-full bg-maize px-3 py-1 text-xs font-bold text-um-blue tracking-wide uppercase">
          Student project
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight">
          Furniture for Wolverines,<br className="hidden sm:block" />
          <span className="text-um-blue"> by Wolverines.</span>
        </h1>
        <p className="text-base text-muted-foreground max-w-xl leading-relaxed">
          MaizeMarket is a peer-to-peer furniture marketplace built specifically
          for University of Michigan students. Every account is tied to a
          verified <span className="font-medium text-foreground">@umich.edu</span> email
          — so you always know you&apos;re dealing with a fellow Wolverine.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link
            href="/listings"
            className={cn(
              buttonVariants({ size: 'sm' }),
              'bg-um-blue text-white hover:bg-um-blue-light font-semibold'
            )}
          >
            Browse listings
          </Link>
          <Link
            href="/register"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'font-semibold'
            )}
          >
            Create an account
          </Link>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Feature cards */}
      <div className="space-y-4">
        <FeatureCard icon={ShieldCheck} heading="Verified UMich students only">
          <p>
            To create an account, you must sign up with a{' '}
            <span className="font-medium text-foreground">@umich.edu</span> email
            address. Supabase Auth sends a confirmation link to that address —
            if you can click it, you&apos;re a Wolverine.
          </p>
          <p>
            This single gate is what makes MaizeMarket meaningfully safer than
            Facebook Marketplace or Craigslist. On those platforms, anyone can
            contact you — you have no idea who you&apos;re meeting. Here, every
            buyer and every seller is a current or recently enrolled Michigan student.
            You can always look them up in the campus directory before you meet.
          </p>
        </FeatureCard>

        <FeatureCard icon={Clock} heading="Built around Ann Arbor's lease cycle">
          <p>
            Ann Arbor leases almost universally flip on{' '}
            <span className="font-medium text-foreground">August 1st</span>.
            That creates a predictable, lopsided market:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li>
              <span className="font-medium text-foreground">April – May:</span>{' '}
              graduating seniors and outgoing students list furniture they can&apos;t take home.
            </li>
            <li>
              <span className="font-medium text-foreground">August:</span>{' '}
              incoming students and returning upperclassmen scramble to furnish new apartments.
            </li>
          </ul>
          <p>
            The gap between supply and demand is the problem MaizeMarket solves.
            Browse early — the best stuff goes fast, and the students listing in
            May are often willing to hold until August.
          </p>
        </FeatureCard>

        <FeatureCard icon={Users} heading="Peer-to-peer, no middleman">
          <p>
            MaizeMarket doesn&apos;t handle payments, storage, or moving. It&apos;s a
            direct connection between students. Message the seller, agree on a price,
            meet in a public place on campus, hand over cash (or Venmo), and carry
            the couch up to your apartment together.
          </p>
          <p>
            Each listing includes a{' '}
            <span className="font-medium text-foreground">logistics tier</span>{' '}
            — whether it&apos;s a one-person carry, needs a second set of hands, or
            requires a pickup truck — so you can filter for things you can actually move.
          </p>
        </FeatureCard>
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl bg-muted/60 px-5 py-4 text-xs text-muted-foreground leading-relaxed">
        MaizeMarket is an independent student project and is not affiliated with,
        endorsed by, or officially connected to the University of Michigan.
        All transactions are directly between buyers and sellers. Always meet in
        a safe, public location — the UMich campus has plenty.
      </div>

    </div>
  );
}
