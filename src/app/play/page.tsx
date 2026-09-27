import type { Metadata } from 'next';
import { GameScreen } from '@/components/game/game-screen';

export const metadata: Metadata = { title: 'Oyun' };

export default function PlayPage() {
  return <GameScreen />;
}
