'use client';
import { useEffect } from 'react';
import { useAppStore, currentScreen } from '@/game/store/appStore';
import { audio } from '@/lib/audio';
import AuthStack from './stacks/AuthStack';
import MainMenu from './stacks/MainMenu';
import OptionsStack from './stacks/OptionsStack';
import CreditsStack from './stacks/CreditsStack';
import CharacterCreator from './stacks/CharacterCreator';
import GameScreen from './stacks/GameScreen';
import StatsStack from './stacks/StatsStack';
import HelpStack from './stacks/HelpStack';
import { KkIconSprite } from './ui/KkIcon';
import UiTheme from './ui/UiTheme';

export default function App() {
  const screen = useAppStore(currentScreen);
  const setUser = useAppStore((s) => s.setUser);
  const resetTo = useAppStore((s) => s.resetTo);
  const settings = useAppStore((s) => s.settings);

  // restore an existing session on startup
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setUser(d.user, d.hasSave);
          resetTo('menu');
        }
      })
      .catch(() => {});
  }, [setUser, resetTo]);

  useEffect(() => {
    audio.setVolumes(settings.masterVolume, settings.sfxVolume);
  }, [settings.masterVolume, settings.sfxVolume]);

  // one-time audio unlock + preload on first interaction
  useEffect(() => {
    const unlock = () => {
      audio.preload();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const body = (() => {
    switch (screen) {
    case 'auth': return <AuthStack />;
    case 'menu': return <MainMenu />;
    case 'options': return <OptionsStack />;
    case 'credits': return <CreditsStack />;
    case 'create': return <CharacterCreator />;
    case 'game': return <GameScreen />;
    case 'stats': return <StatsStack />;
    case 'help': return <HelpStack />;
    default: return null;
    }
  })();

  return (
    <>
      {/* the icon symbol sheet must live in the document for <use> to resolve,
          and the lane/quality attributes drive the whole surface treatment */}
      <KkIconSprite />
      <UiTheme />
      {body}
    </>
  );
}
