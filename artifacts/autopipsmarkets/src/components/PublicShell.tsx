import { useState, type ReactNode } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'wouter';

const navItems = [
  ['Home', '/'], ['About', '/about'], ['Features', '/features'],
  ['Trading Guide', '/trading-guide'], ['Analytics Guide', '/analytics-guide'],
  ['Auto-Trading', '/auto-trading'], ['Blog', '/blog'], ['Contact', '/contact'],
] as const;

function Brand({ footer = false }: { footer?: boolean }) {
  return <Link href="/" className={`brand-lockup ${footer ? 'terminal-brand' : ''}`} data-testid="link-brand">
    <b className="brand-glyph">T</b><span>tradeit<span style={{ color: '#668779' }}>X</span></span>
  </Link>;
}

export function PublicShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  return <div className="site-shell">
    <header className="topnav">
      <Brand />
      <nav className="nav-links" aria-label="Main navigation">
        {navItems.map(([label, href]) => <Link key={href} href={href} className={location === href ? 'active' : ''} data-testid={`link-nav-${href.replaceAll('/', '') || 'home'}`}>{label}</Link>)}
      </nav>
      <Link className="nav-cta" href="/dashboard" data-testid="link-nav-dashboard">Open terminal <ArrowRight size={13} /></Link>
      <button className="mobile-nav-trigger" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} data-testid="button-mobile-menu">
        {menuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      {menuOpen && <nav className="mobile-menu" aria-label="Mobile navigation">
        {navItems.map(([label, href]) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} data-testid={`mobile-link-${href.replaceAll('/', '') || 'home'}`}>{label}</Link>)}
        <Link className="nav-cta" href="/dashboard" onClick={() => setMenuOpen(false)}>Open Dashboard <ArrowRight size={13} /></Link>
      </nav>}
    </header>
    {children}
    <footer className="footer">
      <div><Brand footer /><p>Practice the process, not the pressure. TradeitX is a learning-first terminal with simulated prices and no broker execution.</p><span className="disclaimer">Market scenarios are educational simulations. Not investment advice.</span></div>
      <nav className="footer-nav">{navItems.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav>
    </footer>
  </div>;
}

export default PublicShell;
