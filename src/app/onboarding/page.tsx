export default function OnboardingPage() {
  return (
    <div className="page stack">
      <section className="card stack">
        <span className="eyebrow">Passport check-in</span>
        <h1 className="h1">Claim your boarding pass.</h1>
        <p className="copy">This is a static local prototype form. Wire it to Supabase once your Base6 project exists.</p>
      </section>
      <section className="card form-grid">
        <input className="input" placeholder="Username" />
        <input className="input" placeholder="Platform handle / gamertag" />
        <select className="input" defaultValue="">
          <option value="" disabled>Choose platform</option>
          <option>PlayStation</option>
          <option>Xbox</option>
          <option>PC</option>
        </select>
        <textarea className="textarea" placeholder="Passport bio" />
        <button className="button primary">Finish check-in</button>
      </section>
    </div>
  );
}
