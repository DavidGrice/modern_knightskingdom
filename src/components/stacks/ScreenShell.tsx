'use client';
// CLN-31 · the `kk-screen-head`/`kk-screen-actions` outer chrome CreditsStack,
// HelpStack, OptionsStack and CharacterCreator each hand-typed. The head block
// is byte-identical in shape across all 4 (`<h2>{title}</h2><span
// className="rule"/><span className="hint">{hint}</span>`, only the text
// differs -- including CharacterCreator's ternary hint, which is still just a
// ReactNode). The actions block genuinely differs (Credits/Help/Options each
// have exactly one Back button with `marginLeft:'auto'`; CharacterCreator has
// two, neither with that margin), so `ScreenActions` stays a thin wrapper --
// each screen keeps authoring its own button(s) as children.
export function ScreenHead({ title, hint }: { title: React.ReactNode; hint: React.ReactNode }) {
  return (
    <div className="kk-screen-head">
      <h2>{title}</h2>
      <span className="rule" />
      <span className="hint">{hint}</span>
    </div>
  );
}

export function ScreenActions({ children }: { children: React.ReactNode }) {
  return <div className="kk-screen-actions">{children}</div>;
}
