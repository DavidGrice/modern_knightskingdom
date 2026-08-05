// Wave 6 · hidden world-data editor. Server component so the gate is a real
// server-side check (a client-side hide would still ship the page/bundle to
// anyone who asked) — see worldEditorGate.ts for why this is a bare
// NODE_ENV check rather than a user-id allow-list.
import { notFound } from 'next/navigation';
import { worldEditorEnabled } from '@/lib/server/worldEditorGate';
import WorldEditorClient from './WorldEditorClient';

export const metadata = { title: 'World Editor — dev only' };

export default function WorldEditorPage() {
  if (!worldEditorEnabled()) notFound();
  return <WorldEditorClient />;
}
