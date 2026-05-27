// ─────────────────────────────────────────────────────────────
// MaizeMarket — Nudge Logic (amendment #6)
//
// Supports both fall (Aug/Sept) and winter (Jan) move-in dates.
// Pure functions — no side effects, safe to call in Server or Client Components.
// ─────────────────────────────────────────────────────────────

export type NudgeVariant = 'set_date' | 'early' | 'soon' | 'imminent';

export interface NudgeConfig {
  variant: NudgeVariant;
  headline: string;
  subtext: string;
  /** Days until move-in (undefined for set_date variant) */
  daysUntilMoveIn?: number;
  /** Color treatment for the banner */
  tone: 'info' | 'warm' | 'urgent';
}

// Move-in season detection based on the move-in month
type MoveInSeason = 'fall' | 'winter' | 'other';

function detectSeason(moveInMonth: number): MoveInSeason {
  // Fall: July (6) through September (8) — Ann Arbor Aug 1 leases
  if (moveInMonth >= 6 && moveInMonth <= 8) return 'fall';
  // Winter: December (11) through February (1) — January semester
  if (moveInMonth === 11 || moveInMonth <= 1) return 'winter';
  return 'other';
}

/**
 * Returns contextual nudge messaging given a move-in date.
 *
 * Nudge windows:
 *   imminent:  0–14 days   → "Moving in soon!"
 *   soon:     15–45 days   → "Move-in is coming up — act fast"
 *   early:    46–180 days  → "Good furniture is being listed now" (season-aware copy)
 *   null:     > 180 days or past move-in date → no nudge shown
 */
export function getNudgeConfig(
  moveInDate: Date,
  today: Date = new Date()
): NudgeConfig | null {
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntilMoveIn = Math.ceil(
    (moveInDate.getTime() - today.getTime()) / msPerDay
  );

  // Past move-in date or too far out → no nudge
  if (daysUntilMoveIn <= 0 || daysUntilMoveIn > 180) return null;

  const season = detectSeason(moveInDate.getMonth());

  // ── Imminent: 0–14 days ──────────────────────────────────────
  if (daysUntilMoveIn <= 14) {
    return {
      variant: 'imminent',
      headline: 'Moving in soon!',
      subtext:
        `Your move-in is ${daysUntilMoveIn === 1 ? 'tomorrow' : `in ${daysUntilMoveIn} days`}. ` +
        `Browse now for any last-minute pieces you still need.`,
      daysUntilMoveIn,
      tone: 'urgent',
    };
  }

  // ── Soon: 15–45 days ─────────────────────────────────────────
  if (daysUntilMoveIn <= 45) {
    return {
      variant: 'soon',
      headline: 'Move-in is coming up fast.',
      subtext:
        `${daysUntilMoveIn} days until move-in — the best furniture gets claimed quickly. ` +
        `Don't wait on something you've already spotted.`,
      daysUntilMoveIn,
      tone: 'warm',
    };
  }

  // ── Early: 46–180 days (season-aware copy) ───────────────────
  if (season === 'fall') {
    return {
      variant: 'early',
      headline: 'Students are already listing for fall.',
      subtext:
        `Ann Arbor's Aug 1st leases mean move-out season peaks in April–May. ` +
        `The best couches, desks, and dressers get claimed weeks before move-in — ` +
        `browse now and commit early.`,
      daysUntilMoveIn,
      tone: 'info',
    };
  }

  if (season === 'winter') {
    return {
      variant: 'early',
      headline: 'Winter move-in is closer than you think.',
      subtext:
        `Students leaving for winter break list furniture before they head home. ` +
        `Great deals are available now — browse before January prices rise.`,
      daysUntilMoveIn,
      tone: 'info',
    };
  }

  // Other move-in dates (spring, etc.)
  return {
    variant: 'early',
    headline: 'Good furniture goes fast.',
    subtext: `You're moving in ${daysUntilMoveIn} days — students list the best pieces early. Browse now.`,
    daysUntilMoveIn,
    tone: 'info',
  };
}

/**
 * Returns a nudge to prompt users who haven't set a move-in date yet.
 * Shown to all logged-in users with no move_in_date set.
 */
export function getSetDateNudge(): NudgeConfig {
  return {
    variant: 'set_date',
    headline: 'When are you moving in?',
    subtext:
      `Set your move-in date and we'll surface listings at exactly the right time — ` +
      `before everyone else scrambles in August.`,
    tone: 'info',
  };
}
