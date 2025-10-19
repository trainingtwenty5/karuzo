import privacyHtml from '../partials/privacy.html?raw';

export default function PrivacyPolicyPage() {
  return (
    <div
      className="legal-page"
      style={{ paddingTop: 'calc(var(--topbar-height) + var(--header-height))' }}
      dangerouslySetInnerHTML={{ __html: privacyHtml }}
    />
  );
}
