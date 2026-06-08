import Link from "next/link";

export default function SiteNav() {
  return (
    <nav style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
      <Link
        href="/"
        style={{
          padding: '10px 18px',
          backgroundColor: '#3498db',
          color: 'white',
          borderRadius: '6px',
          textDecoration: 'none',
          fontWeight: 'bold',
          fontSize: '14px',
        }}
      >
        Home
      </Link>
      <Link
        href="/saved-games"
        style={{
          padding: '10px 18px',
          backgroundColor: '#2c3e50',
          color: 'white',
          borderRadius: '6px',
          textDecoration: 'none',
          fontWeight: 'bold',
          fontSize: '14px',
        }}
      >
        Saved Games
      </Link>
    </nav>
  );
}
