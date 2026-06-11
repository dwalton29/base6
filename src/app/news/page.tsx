import Base6NewsBoard from "@/components/news/Base6NewsBoard";

export const dynamic = "force-dynamic";

export default function NewsPage() {
  return (
    <div className="page stack news-page">
      <header className="news-muted-header">
        <span className="eyebrow">News</span>
      </header>
      <Base6NewsBoard />
    </div>
  );
}
