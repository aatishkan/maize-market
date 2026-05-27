'use client';

import { useState } from 'react';
import { MoveInDatePrompt } from './MoveInDatePrompt';

/** Auto-opens the move-in date dialog after first login. */
export function MoveInDatePromptWrapper({ userId }: { userId: string }) {
  const [open, setOpen] = useState(true);

  return (
    <MoveInDatePrompt
      open={open}
      onClose={() => setOpen(false)}
      userId={userId}
    />
  );
}
