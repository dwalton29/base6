export default function PageHeader({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <section className="card stack">
      <span className="eyebrow">{eyebrow}</span>
      <h1 className="h1">{title}</h1>
      <p className="copy">{copy}</p>
    </section>
  );
}
