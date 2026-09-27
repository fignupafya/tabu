'use client';

import { Maximize, Minimize } from 'lucide-react';
import { useFullscreen } from '@/lib/hooks';
import { IconButton } from './button';

/** Toggles full screen; not shown where the browser doesn't allow it (Safari on iPhone). */
export function FullscreenButton() {
  const { supported, active, toggle } = useFullscreen();
  if (!supported) return null;
  return (
    <IconButton label={active ? 'Tam ekrandan çık' : 'Tam ekran'} onClick={toggle}>
      {active ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
    </IconButton>
  );
}
