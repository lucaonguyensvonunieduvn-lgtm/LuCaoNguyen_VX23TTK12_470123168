export function SimplePage({ title, text }: { title: string; text: string }) {
  return (
    <>
      <section className="page-hero">
        <h1 className="page-title">{title}</h1>
        <p>{text}</p>
      </section>
      <section className="page">
        <div className="empty-note">This section is part of the storefront shell. Shopping tools arrive in the next phases.</div>
      </section>
    </>
  );
}
