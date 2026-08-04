'use client';
import { useAppStore } from '@/game/store/appStore';

export default function CreditsStack() {
  const pop = useAppStore((s) => s.pop);
  const uiTheme = useAppStore((s) => s.settings.uiTheme);
  return (
    <div className={`kk-screen kk-screen-scroll kk-screen-${uiTheme}`}>
      <div className="kk-screen-pad">
        <div className="kk-screen-head">
          <h2>CREDITS</h2>
          <span className="rule" />
          <span className="hint">a non-commercial fan preservation</span>
        </div>
        {/* every attribution below is kept verbatim — the preservation
            credit and the owned-original note are not optional */}
        <div className="kk-doc">
          <h3>Knights&apos; Kingdom — Modern</h3>
          <p>
            A fan-made 3D remake adventure built with Next.js, React, Three.js and Node.js.
            You begin as a humble peasant and work your way to knighthood and beyond:
            chop, mine, smith, fish — and build a homestead into a castle.
          </p>
          <h3>Original Game</h3>
          <p>
            LEGO Creator: Knights&apos; Kingdom (LEGO Media, 2000), built on the
            Superscape VRT 5.10 engine. All models, textures, palettes and sounds in this
            remake were extracted from an original copy of the game.
          </p>
          <h3>Asset Preservation</h3>
          <p>
            Models, the global color palette, animations and the sound bank come from the
            Knights&apos; Kingdom decompilation &amp; modernization project — a reverse-engineering
            effort covering the LCA/VCA, DPAK, XVR, SPRT and SOUN formats.
          </p>
          <p>
            Special thanks to Richard Hill, an original developer of the game, who generously
            provided the Superscape SDK 5.71 documentation and VRT headers.
          </p>
          <h3>Legal</h3>
          <p>
            Superscape VRT © Superscape VR plc. LEGO® is a trademark of the LEGO Group, which
            does not sponsor, authorize, or endorse this project. This is a non-commercial fan
            preservation effort in the spirit of the LEGO Island community projects.
          </p>
          <h3>Technology</h3>
          <p>Next.js · React · Three.js · React Three Fiber · Zustand · Node.js</p>
        </div>
        <div className="kk-screen-actions">
          <button className="kk-btn-quiet" onClick={pop} style={{ marginLeft: 'auto' }}>Back</button>
        </div>
      </div>
    </div>
  );
}
