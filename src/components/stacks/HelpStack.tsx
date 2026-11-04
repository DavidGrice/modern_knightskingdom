'use client';
import { useAppStore } from '@/game/store/appStore';
import { useGameStore } from '@/game/store/gameStore';
import { codeLabel, movementLabel } from '@/game/data/keybinds';
import { resolveInputDevice, interactLabel, clickHoldLabel, blockLabel, type Bindings, type InputDevice } from '@/game/inputMode';
import { ScreenHead, ScreenActions } from './ScreenShell';

interface Step {
  title: string;
  img: string;
  body: string;
}

/** F-10a · every key named here is the player's own binding (codeLabel of
 *  the keybind map), and the interact, gather and block controls are named
 *  for the device in hand (inputMode.ts) — 'hold E' to gather was wrong on a
 *  keyboard even before any rebind: gathering is a held left-click there. */
export function helpSteps(b: Bindings, device: InputDevice): Step[] {
  const k = (action: string) => codeLabel(b.keybinds[action]);
  const gather = device === 'keyboard' ? 'left-click' : clickHoldLabel(device, b);
  return [
    {
      title: '1. Forge Your Hero',
      img: '/help/01_create.png',
      body: 'Pick Male or Female, a face and a body type, then recolor your gear with the palette swatches. Drag the preview to look them over, or toggle Standing/Running to see them move. Appearance never affects rank — that’s earned entirely through what you do in the world.',
    },
    {
      title: '2. Find Your Bearings',
      img: '/help/02_hud.png',
      body: `${movementLabel(b.keybinds)} walks, ${k('sprint')} sprints (it spends stamina, so pace yourself), ${k('jump')} jumps, and the mouse looks around once you click to lock the cursor (arrow keys work too). Open your Satchel (${k('inventory')}) and expand the 🎮 Controls line any time for the full key list. Your name, rank and vigour sit top-left, the compass and clock top-right with the tracked quest beneath them, and the bottom band carries your resources, readied gear and the minimap.`,
    },
    {
      title: '3. Gather',
      img: '/help/03_gather.png',
      body: `Walk up to a tree, boulder, fishing spot or herb patch and hold ${gather} — a prompt and a filling progress bar show you’re on the right track. Trees give wood, boulders give stone (and sometimes iron once Mining is learned), the pond gives fish, and forest herb patches give herbs for alchemy.`,
    },
    {
      title: '4. Craft',
      img: '/help/04_craft.png',
      body: `Press ${k('craft')} to open Crafting any time. Every recipe in the game is always listed — locked ones show a padlock and exactly what unlocks them (usually a quest). Simple items like planks are crafted by hand; tools and weapons need you standing near the right station (workbench, forge, campfire).`,
    },
    {
      title: '5. Quests & the Realm',
      img: '/help/05_quests.png',
      body: `Press ${k('quests')} for the Quest Log — a clear chain from "First Steps" to "Paladin’s Keep", each one unlocking a new skill or building. As you progress, King Leo, Queen Leonora and other court figures arrive in person; press ${interactLabel(device, b)} near them to talk, hear their voiced greeting, and pick up repeatable errands for extra rewards.`,
    },
    {
      title: '6. Build Your Homestead',
      img: '/help/06_build.png',
      body: `Press ${k('build')} for the aerial Build View: pick a piece from the category tabs on the right, hold left-click to place it (green means valid, red means it isn’t), R rotates it, and right-click removes it for a partial refund. Start with a campfire and workbench — everything else grows from there.`,
    },
    {
      title: '7. Gear Up for Combat',
      img: '/help/07_equipment.png',
      body: `Open your Satchel with ${k('inventory')} to see your equipped weapon and armor on a rotatable paperdoll. Craft a sword for real melee damage and a shield to block (${blockLabel(device, b)}); ${k('swapWeapon')} cycles between melee, crossbow and longbow once you own them. Skeletons rise at night and raiders test your walls at dusk — armor and a shut gate both help you survive it.`,
    },
  ];
}

export default function HelpStack() {
  const pop = useAppStore((s) => s.pop);
  const uiTheme = useAppStore((s) => s.settings.uiTheme);
  const settings = useAppStore((s) => s.settings);
  const activeDevice = useGameStore((s) => s.activeInputDevice);
  const steps = helpSteps(settings, resolveInputDevice(settings.inputMode, activeDevice));
  const helpKey = codeLabel(settings.keybinds.help);

  return (
    <div className={`kk-screen kk-screen-${uiTheme}`}>
      <div className="kk-screen-pad">
        <ScreenHead title="HOW TO PLAY" hint={`${helpKey} reopens this in-game`} />
        <div className="kk-doc">
          <div className="kk-doc-lead">
            A quick tour of the essentials — press <b>{helpKey}</b> any time in-game to come back here.
          </div>
          {steps.map((s) => {
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
        <ScreenActions>
          <button className="kk-btn-quiet" onClick={pop} style={{ marginLeft: 'auto' }}>Back</button>
        </ScreenActions>
      </div>
    </div>
  );
}
