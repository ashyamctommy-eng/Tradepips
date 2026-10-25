import { ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import PublicShell from '@/components/PublicShell';

function MarketIllustration() {
  return <div className="hero-art" aria-label="Illustrative simulated market chart">
    <div className="art-label">EUR/USD · PRACTICE SESSION 04</div>
    <svg className="chart-hero-svg" viewBox="0 0 560 340" role="img" aria-label="Illustrative price movement">
      <defs><linearGradient id="heroFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#447b68" stopOpacity=".23" /><stop offset="1" stopColor="#447b68" stopOpacity="0" /></linearGradient></defs>
      <path d="M0 255 C35 240 40 209 75 223 S119 268 149 212 S202 181 230 194 S275 233 307 164 S354 191 380 147 S427 145 453 101 S506 122 560 54 L560 340 L0 340Z" fill="url(#heroFill)" />
      <path d="M0 255 C35 240 40 209 75 223 S119 268 149 212 S202 181 230 194 S275 233 307 164 S354 191 380 147 S427 145 453 101 S506 122 560 54" fill="none" stroke="#2c6658" strokeWidth="3" />
      {[50, 130, 210, 290].map(y => <line key={y} x1="0" x2="560" y1={y} y2={y} stroke="#65877a" strokeOpacity=".25" strokeDasharray="3 6" />)}
      <circle cx="560" cy="54" r="6" fill="#f3c800" />
    </svg>
    <div className="art-stamp">PAPER<br />NOT LIVE<br />FX LAB</div><div className="art-quote">01 / 04<br />risk before reward</div>
  </div>;
}

function AnalyticsPreview() {
  return <div className="metric-preview">
    <div className="metric-box"><div className="section-kicker">Practice win rate</div><div className="metric-big">68.4%</div><div className="metric-mini">+4.8 pts across 32 simulated trades</div>
      <svg className="metric-chart" viewBox="0 0 300 190" preserveAspectRatio="none" aria-label="Illustrative simulated win-rate chart"><path d="M0 156 C35 144 43 158 72 132 S115 145 136 106 S177 118 200 85 S235 104 260 55 S283 64 300 34" fill="none" stroke="#f3c800" strokeWidth="2" /></svg>
    </div>
    <div className="metric-box drawdown"><div className="section-kicker">Max drawdown</div><div className="metric-big">−3.2%</div><div className="metric-mini">Risk stayed inside your 5% practice limit</div>
      <svg className="metric-chart" viewBox="0 0 520 190" preserveAspectRatio="none" aria-label="Illustrative simulated drawdown chart"><path d="M0 70 C40 90 55 64 93 97 S145 75 181 122 S221 91 260 110 S308 142 347 119 S397 156 440 123 S488 156 520 141" fill="none" stroke="#4d8573" strokeWidth="2" /></svg>
    </div>
  </div>;
}

export function HomePage() {
  return <PublicShell><main className="page-wrap">
    <section className="hero-home">
      <div className="enter"><div className="eyebrow">A clearer way to practice markets</div><h1>Ready to start <em>trading?</em></h1>
        <p>Build your trading routine in a thoughtful paper terminal. Explore FX options, test a strategy, and learn from every simulated decision—without putting real money at risk.</p>
        <div className="hero-actions"><Link href="/dashboard" className="button-yellow" data-testid="button-open-dashboard">Open Dashboard <ArrowRight size={14} /></Link><Link href="/features" className="button-quiet" data-testid="button-explore-features">Explore features</Link></div>
        <div className="trust-row"><div className="trust-badge"><LockKeyhole size={15} /> Secure session</div><div className="trust-badge"><ShieldCheck size={15} /> Encrypted account data</div><div className="trust-badge">PAPER · ZERO EXECUTION</div></div>
      </div><MarketIllustration />
    </section>
    <section className="section-block"><div className="section-kicker">01 / Measure your method</div><h2 className="section-heading">More than a demo. <em>A practice that remembers.</em></h2><p className="section-copy">Track what matters between entries and exits. TradeitX turns a simulated session into a useful learning loop—with analytics that put process ahead of prediction.</p><AnalyticsPreview /></section>
    <section className="section-block split-section"><div><div className="section-kicker">02 / Built for the work</div><h2 className="section-heading">Your edge is a <em>repeatable process.</em></h2><p className="section-copy">A focused interface for exploring digital options on simulated FX markets. Clear expirations. Deliberate sizing. An honest record of every practice decision.</p><Link href="/trading-guide" className="button-quiet">Read the trading guide <ArrowRight size={13} /></Link></div>
      <div className="feature-list">{[['01', 'Start with a thesis', 'Choose a market and define what would invalidate your idea.'], ['02', 'Set the boundary', 'Pick an investment and expiration before direction.'], ['03', 'Review without noise', 'Use your journal and analytics to find patterns over time.']].map(([index, title, detail]) => <div className="feature-row" key={index}><span className="feature-index">{index}</span><div><b>{title}</b><p>{detail}</p></div></div>)}</div>
    </section>
    <section className="section-block split-section"><div className="content-panel"><div className="section-kicker">A terminal with boundaries</div><h2>Simulated by design.</h2><p>Prices and outcomes in this learning environment are simulated. There is no broker connection, no deposit flow, and no real-money execution.</p><Link href="/about" className="button-quiet">Why TradeitX exists <ArrowRight size={13} /></Link></div><div><div className="section-kicker">03 / Take the next step</div><h2 className="section-heading">Practice with <em>intention.</em></h2><p className="section-copy">Your next session can start with a single question worth testing.</p><Link href="/dashboard" className="button-yellow">Open Dashboard <ArrowRight size={14} /></Link></div></section>
    <div className="risk-banner"><div><h2>Learn the setup. Keep the stakes simulated.</h2><p>TradeitX is an educational paper-trading product. Simulated results do not represent actual market execution or future performance.</p></div><Link className="button-yellow" href="/dashboard">Enter practice terminal <ArrowRight size={14} /></Link></div>
  </main></PublicShell>;
}

const content: Record<string, { kicker: string; title: string; description: string; sections: [string, string][] }> = {
  '/about': { kicker: 'OUR POINT OF VIEW', title: 'Practice is a skill. Treat it like one.', description: 'TradeitX is a learning-first trading terminal for people building confidence with FX options and strategy workflows.', sections: [['A safe place to get specific', 'No broker connection. No real-money execution. A clear space to rehearse decisions and examine the process behind them.'], ['Made for thoughtful repetition', 'Markets reward preparation, but learning comes from structured practice. TradeitX gives each session a beginning, a boundary, and a review.']] },
  '/features': { kicker: 'THE TERMINAL', title: 'Everything around the decision.', description: 'A streamlined practice environment for chart reading, simulated entries, strategy experiments, and performance reflection.', sections: [['FX options workflow', 'Choose a currency pair, set an investment, define an expiration, then practice a BUY or SELL thesis with a visible simulated payout.'], ['Charts and indicators', 'Use a native chart with RSI, MACD, Bollinger Bands, and moving averages to frame—not dictate—your analysis.'], ['Strategy routines', 'Explore Trend Follower and Mean Reversion templates, or sketch a custom approach for your next paper session.'], ['Analytics that teach', 'Review win rate, drawdown, and session history as measures of practice—not promises of performance.']] },
  '/trading-guide': { kicker: 'LEARNING PATH · 01', title: 'A more deliberate way to trade.', description: 'A simple framework for exploring a simulated digital-options workflow without confusing practice for execution.', sections: [['Choose a pair and timeframe', 'Begin with a market you can explain. Read the simulated quote and chart context before selecting an expiration.'], ['Write down your thesis', 'What would make price move in your direction? What would prove you wrong? A good practice entry starts with a falsifiable idea.'], ['Set the amount and timer', 'Investment and expiry are part of the decision. Keep both modest in your practice plan and note why you chose them.'], ['Review the result honestly', 'A single outcome is noisy. Record whether your process was followed, then look for patterns over a larger sample.']] },
  '/analytics-guide': { kicker: 'LEARNING PATH · 02', title: 'Read the pattern, not the promise.', description: 'Use performance metrics as feedback about your practice habits. No metric can guarantee a future result.', sections: [['Win rate needs context', 'A win rate alone leaves out payout, sample size, and risk. Compare it with your own recorded strategy and timeframe.'], ['Drawdown shows friction', 'Drawdown illustrates a sequence of losses or equity dips. Use it to reflect on position sizing and emotional comfort.'], ['Compare like with like', 'Separate strategies and market conditions. A small, consistent sample is more useful than a blended headline number.'], ['Treat every chart as simulated', 'Analytics in TradeitX describe paper activity only and do not forecast live market performance.']] },
  '/auto-trading': { kicker: 'STRATEGY WORKFLOWS', title: 'Automation begins with a rule.', description: 'Explore repeatable strategy ideas in a simulated environment. TradeitX does not connect strategies to brokers or place trades in real markets.', sections: [['Trend Follower', 'A practice template that looks for sustained directional movement and waits for a confirmation before a simulated entry.'], ['Mean Reversion', 'A practice template for studying how price behaves around a rolling average after an extended move.'], ['Custom Strategy', 'Compose a hypothesis, choose indicators, and define your own review rules in the terminal. The workflow is a learning preview, not an execution bot.'], ['AI-assist preview', 'A local heuristic can summarize a few chart conditions as a demo preview. It is not AI-generated, not financial advice, and not a trade signal.']] },
  '/contact': { kicker: 'SAY HELLO', title: 'Questions make better products.', description: 'Send a note about the learning experience, accessibility, or product support. We will route your message to the right place.', sections: [['Product support', 'For sign-in or account access, include the email on your demo account. Never send a password.'], ['Learning feedback', 'Tell us where the workflow feels unclear or what would make your practice review more useful.']] },
};

function ContactForm() {
  const [sent, setSent] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSent(true); };
  return <form className="content-panel" onSubmit={submit}><h2>Send a message</h2>
    <label className="field-label" htmlFor="contact-name">YOUR NAME</label><input id="contact-name" className="trade-input" required data-testid="input-contact-name" />
    <label className="field-label" htmlFor="contact-email">EMAIL</label><input id="contact-email" className="trade-input" required type="email" data-testid="input-contact-email" />
    <label className="field-label" htmlFor="contact-message">MESSAGE</label><textarea id="contact-message" className="trade-input" required style={{ height: 120, paddingTop: 10 }} data-testid="input-contact-message" />
    <button type="submit" className="button-yellow" style={{ marginTop: 14 }} data-testid="button-contact-send">{sent ? 'Message noted' : 'Send message'}</button>
    {sent && <p role="status">Thanks for the note. This contact form is a local demo and has not sent an email.</p>}
  </form>;
}

export function InfoPage({ path }: { path: string }) {
  const page = content[path] ?? content['/about'];
  return <PublicShell><main className="page-wrap"><section className="page-hero"><div className="eyebrow">{page.kicker}</div><h1>{page.title}</h1><p>{page.description}</p></section>
    <section className="content-grid">{page.sections.map(([heading, text], index) => <article className="content-panel" key={heading}><div className="section-kicker">0{index + 1} / TRADEITX</div><h2>{heading}</h2><p>{text}</p></article>)}</section>
    {path === '/contact' && <ContactForm />}
    <div className="risk-banner"><div><h2>Practice is not a prediction.</h2><p>All prices and outcomes are simulated. There is no broker connectivity or real-money execution.</p></div><Link className="button-yellow" href="/dashboard">Open Dashboard <ArrowRight size={14} /></Link></div>
  </main></PublicShell>;
}
