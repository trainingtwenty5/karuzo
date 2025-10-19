import termsHtml from '../partials/terms.html?raw';

export default function TermsPage() {
  return (
    <div
      className="legal-page"
      style={{ paddingTop: 'calc(var(--topbar-height) + var(--header-height))' }}
      dangerouslySetInnerHTML={{ __html: termsHtml }}
    />
  );
}
