import { unstable_noStore as noStore } from 'next/cache';
import { Navbar } from '@/components/shared/Navbar';
import { EarlyBrowseNudge } from '@/components/shared/EarlyBrowseNudge';
import { MoveInDatePromptWrapper } from '@/components/profile/MoveInDatePromptWrapper';
import { createClient } from '@/lib/supabase/server';
import { getNudgeConfig, getSetDateNudge } from '@/lib/nudge';
import type { Profile } from '@/types/database';
import type { NudgeConfig as NudgeConfigType } from '@/lib/nudge';

interface MainLayoutProps {
  children: React.ReactNode;
  searchParams?: Promise<{ prompt_move_in?: string }>;
}

// Force fresh server data on every request — prevents Next.js Data Cache from
// serving a stale getUser() response that predates the user's login.
export const dynamic = 'force-dynamic';

export default async function MainLayout({ children, searchParams }: MainLayoutProps) {
  noStore(); // belt-and-suspenders: also disable per-fetch memoisation
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  let nudgeConfig: NudgeConfigType | null = null;
  let unreadCount = 0;

  if (user) {
    // Fetch profile and conversation IDs in parallel, then count unread messages
    const [profileResult, convoResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase
        .from('conversations')
        .select('id')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`),
    ]);

    profile = profileResult.data as Profile | null;

    // Safety net: the signup trigger should create the profile row automatically,
    // but if it didn't (e.g. the user was created before migrations ran) upsert it
    // now so the Navbar always has something to render.
    if (!profile) {
      const displayName =
        (user.user_metadata?.display_name as string | undefined) ??
        user.email!.split('@')[0];
      await supabase.from('profiles').upsert(
        { id: user.id, email: user.email!, display_name: displayName },
        { onConflict: 'id', ignoreDuplicates: true }
      );
      const retry = await supabase.from('profiles').select('*').eq('id', user.id).single();
      profile = retry.data as Profile | null;
    }

    const convoIds = (convoResult.data ?? []).map((c) => (c as { id: string }).id);
    if (convoIds.length > 0) {
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .neq('sender_id', user.id)
        .is('read_at', null)
        .in('conversation_id', convoIds);
      unreadCount = count ?? 0;
    }

    // Determine nudge
    if (profile?.move_in_date) {
      nudgeConfig = getNudgeConfig(new Date(profile.move_in_date));
    } else if (profile) {
      nudgeConfig = getSetDateNudge();
    }
  }

  // Check if we should show the move-in date prompt (after first login)
  const params = await searchParams;
  const showMoveInPrompt = params?.prompt_move_in === '1' && !!user && !profile?.move_in_date;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar profile={profile} unreadCount={unreadCount} />

      {nudgeConfig && (
        <EarlyBrowseNudge
          config={nudgeConfig}
        />
      )}

      <main className="flex-1 bg-background">
        {children}
      </main>

      <footer className="border-t border-border py-6 text-center">
        <p className="text-xs text-muted-foreground">
          MaizeMarket is a student project, not affiliated with the University of Michigan.
          <br />
          All transactions are between buyers and sellers. Meet safely in public places.
        </p>
      </footer>

      {showMoveInPrompt && profile && (
        <MoveInDatePromptWrapper userId={user.id} />
      )}
    </div>
  );
}
