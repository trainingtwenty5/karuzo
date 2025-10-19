import rodoHtml from '../partials/rodo.html?raw';

export default function RodoPage() {
  return (
    <div
      className="legal-page"
      style={{ paddingTop: 'calc(var(--topbar-height) + var(--header-height))' }}
      dangerouslySetInnerHTML={{ __html: rodoHtml }}
    />
  );
}
