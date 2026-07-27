'use client';
import dynamic from 'next/dynamic';

const App = dynamic(() => import('@/components/App'), {
  ssr: false,
  // I38 · the first thing anyone sees. It used to be a bare line of italic
  // text on the old panel chrome, which had nothing to do with the front door
  // the UI pack established — same plaque and sky as the title screen, so the
  // load reads as the game starting rather than a placeholder.
  loading: () => (
    <div className="kk-screen kk-title-screen">
      <div className="kk-title-sky" />
      <div className="kk-plaque">
        <div className="kk-plaque-word">KNIGHTS&apos; KINGDOM</div>
        <div className="kk-plaque-rule">
          <span />
          <span className="kk-plaque-tag">Saddling up</span>
          <span />
        </div>
      </div>
    </div>
  ),
});

export default function Page() {
  return (
    <main>
      <App />
    </main>
  );
}
