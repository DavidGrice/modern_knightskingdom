'use client';
import { useAppStore } from '@/game/store/appStore';

interface Step {
  title: string;
  img: string;
  body: string;
}

const STEPS: Step[] = [
  {
    title: '1. Forge Your Hero',
    img: '/help/01_create.png',
    body: 'Pick Male or Female, a face and a body type, then recolor your gear with the palette swatches. Drag the preview to look them over, or toggle Standing/Running to see them move. Appearance never affects rank — that’s earned entirely through what you do in the world.',
  },
  {
    title: '2. Find Your Bearings',
    img: '/help/02_hud.png',
    body: 'WASD walks, Shift sprints (it spends stamina, so pace yourself), Space jumps, and the mouse looks around once you click to lock the cursor (arrow keys work too). Open your Satchel (I) and expand the 🎮 Controls line any time for the full key list. Your name, rank and vigour sit top-left, the compass and clock top-right with the tracked quest beneath them, and the bottom band carries your resources, readied gear and the minimap.',
  },
  {
    title: '3. Gather',
    img: '/help/03_gather.png',
    body: 'Walk up to a tree, boulder, fishing spot or herb patch and hold E — a prompt and a filling progress bar show you’re on the right track. Trees give wood, boulders give stone (and sometimes iron once Mining is learned), the pond gives fish, and forest herb patches give herbs for alchemy.',
  },
  {
    title: '4. Craft',
    img: '/help/04_craft.png',
    body: 'Press C to open Crafting any time. Every recipe in the game is always listed — locked ones show a padlock and exactly what unlocks them (usually a quest). Simple items like planks are crafted by hand; tools and weapons need you standing near the right station (workbench, forge, campfire).',
  },
  {
    title: '5. Quests & the Realm',
    img: '/help/05_quests.png',
    body: 'Press J for the Quest Log — a clear chain from "First Steps" to "Paladin’s Keep", each one unlocking a new skill or building. As you progress, King Leo, Queen Leonora and other court figures arrive in person; press E near them to talk, hear their voiced greeting, and pick up repeatable errands for extra rewards.',
  },
  {
    title: '6. Build Your Homestead',
    img: '/help/06_build.png',
    body: 'Press B for the aerial Build View: pick a piece from the category tabs on the right, hold left-click to place it (green means valid, red means it isn’t), R rotates it, and right-click removes it for a partial refund. Start with a campfire and workbench — everything else grows from there.',
  },
  {
    title: '7. Gear Up for Combat',
    img: '/help/07_equipment.png',
    body: 'Open your Satchel with I to see your equipped weapon and armor on a rotatable paperdoll. Craft a sword for real melee damage and a shield to block (RMB); Q cycles between melee, crossbow and longbow once you own them. Skeletons rise at night and raiders test your walls at dusk — armor and a shut gate both help you survive it.',
  },
];

export default function HelpStack() {
  const pop = useAppStore((s) => s.pop);
  const uiTheme = useAppStore((s) => s.settings.uiTheme);

  return (
    <div className={`kk-screen kk-screen-${uiTheme}`}>
      <div className="kk-screen-pad">
        <div className="kk-screen-head">
          <h2>HOW TO PLAY</h2>
          <span className="rule" />
          <span className="hint">H reopens this in-game</span>
        </div>
        <div className="kk-doc">
          <div className="kk-doc-lead">
            A quick tour of the essentials — press <b>H</b> any time in-game to come back here.
          </div>
          {STEPS.map((s) => {
            // the titles carry their own "1. " prefix; split it out so the
            // number can be set at display size beside the shot
            const m = s.title.match(/^(\d+)\.\s*(.*)$/);
            return (
              <div key={s.title} className="kk-step-row">
                <div className="kk-step-shot">
                  <img src={s.img} alt={m?.[2] ?? s.title} draggable={false} />
                </div>
                <div className="kk-step-body">
                  {m && <div className="kk-step-no">{m[1]}</div>}
                  <div className="kk-step-title">{m?.[2] ?? s.title}</div>
                  <div className="kk-step-text">{s.body}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="kk-screen-actions">
          <button className="kk-btn-quiet" onClick={pop} style={{ marginLeft: 'auto' }}>Back</button>
        </div>
      </div>
    </div>
  );
}
