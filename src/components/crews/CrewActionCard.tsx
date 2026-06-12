import Link from "next/link";

export type CrewActionCardProps = {
  title: string;
  description: string;
  cta: string;
  imageUrl?: string | null;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  href?: string;
  onClick?: () => void;
};

export default function CrewActionCard({ title, description, cta, imageUrl, active, danger, disabled, href, onClick }: CrewActionCardProps) {
  const style = imageUrl ? ({ ["--crew-action-image" as string]: `url(${imageUrl})` }) : undefined;
  const className = `crew-action-card crew-action-card-v2${active ? " active" : ""}${danger ? " danger" : ""}${disabled ? " disabled" : ""}`;
  const content = (
    <>
      <strong>{title}</strong>
      <span className="crew-action-spacer" aria-hidden="true" />
      <p>{description}</p>
      <span className="crew-action-cta">{cta}</span>
    </>
  );

  if (href) {
    return <Link className={className} href={href} style={style}>{content}</Link>;
  }

  return <button className={className} type="button" onClick={onClick} disabled={disabled} style={style}>{content}</button>;
}
