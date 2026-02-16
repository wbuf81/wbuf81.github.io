'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Nav } from './components/Nav';

const EXPERTISE_TAGS = [
  'PCI-DSS', 'ISO 27001', 'ISO 27701', 'SOC-2', 'SOX',
  'GDPR', 'CCPA', 'ICANN & Registry Compliance', 'OFAC Sanctions', 'Consumer Protection',
  'Privacy Programs', 'Risk Management', 'IT General Controls',
  'Business Continuity', 'Corporate Governance', 'AI Governance',
  'AI-Assisted Compliance Automation',
];

const REPO_CARDS = [
  {
    title: 'DAISY',
    description: 'An AI-assisted contract review tool built with Next.js and Claude. Helps speed up the early read-through of agreements — not a replacement for legal review, just a head start.',
    href: null,
    badge: 'Private Repo',
  },
  {
    title: 'SMORES',
    description: 'Service mark monitoring and review tooling. Keeps tabs on trademark and brand compliance obligations so things don\u2019t slip through the cracks.',
    href: null,
    badge: 'Private Repo',
  },
  {
    title: 'Compliance Scanner',
    description: 'A multi-language website scanner that checks for GDPR and CCPA compliance elements — privacy notices, cookie banners, required links — across six languages.',
    href: null,
    badge: 'Private Repo',
  },
  {
    title: 'OSCAR',
    description: 'A Chrome extension that scans websites for privacy policies, cookie banners, terms of service, and other compliance elements. Free and open source.',
    href: 'https://github.com/wbuf81/oscar-extension',
    badge: 'Open Source',
  },
];

const DEMO_CARDS = [
  {
    title: 'Interactive Playground',
    description: 'A canvas-based experiment with animations, blob reveals, and parallax effects. Mostly just an excuse to play with the Canvas API.',
    href: '/playground',
  },
  {
    title: 'Moonballs',
    description: 'A 3D golf ball customizer — pick logos, add text, spin it around. Built with Three.js because I wanted to learn it and I like golf.',
    href: '/moonballs',
  },
];

const INTEREST_CARDS = [
  {
    title: 'STEM Mentoring',
    description: 'GatorLaunch mentor at the University of Florida and Big Brothers Big Sisters volunteer since 2011.',
  },
  {
    title: 'Autism & Inclusivity Advocate',
    description: 'Championing neurodiversity awareness and inclusive environments for families and workplaces.',
  },
];

export default function HomePage() {
  return (
    <>
      <Nav />

      {/* Hero */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-text">
            <h1 className="hero-name">Wesley Bard</h1>
            <p className="hero-subtitle">VP, Risk & Compliance | Engineer | AI Builder</p>
          </div>
          <div className="hero-headshot">
            <Image
              src="/headshot.jpg"
              alt="Wesley Bard"
              width={200}
              height={200}
              priority
              style={{ borderRadius: '50%', objectFit: 'cover', width: '200px', height: '200px' }}
            />
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="section">
        <div className="section-inner">
          <h2 className="section-heading">About</h2>
          <p className="about-text">
            I&apos;ve spent the last 20 years somewhere between engineering and compliance — starting as a software engineer at Lockheed Martin, and eventually finding my way into risk and compliance leadership at Newfold Digital. That path wasn&apos;t planned, but I&apos;m grateful it gave me a feel for both sides: how systems are built and how they&apos;re governed.
          </p>
          <p className="about-text" style={{ marginTop: '16px' }}>
            These days, I lead global privacy, risk, and compliance programs at Newfold — work I genuinely enjoy. I&apos;m also spending a lot of my time experimenting with AI in compliance workflows, building agents with Claude and the Anthropic API that help with things like evidence gathering, control testing, and regulatory mapping. It&apos;s early, but it&apos;s the most fun I&apos;ve had at work in a long time.
          </p>
        </div>
      </section>

      {/* Experience */}
      <section id="experience" className="section section-alt">
        <div className="section-inner">
          <h2 className="section-heading">Experience</h2>

          <div className="company">
            <h3 className="company-name">Newfold Digital</h3>
            <p className="company-note">formerly Web.com / Endurance International — 11+ years</p>

            <div className="role">
              <div className="role-header">
                <span className="role-title">Vice President, Risk and Compliance</span>
                <span className="role-dates">Jun 2021 – Present</span>
              </div>
              <p className="role-desc">I oversee our global compliance programs — PCI-DSS, ISO 27001, SOC-2, GDPR, CCPA, ICANN and registry compliance, OFAC sanctions, and consumer protection — with a great team spread across multiple regions. Lately I&apos;ve been spending a lot of time exploring how AI can help with the more repetitive parts of the work, like evidence gathering and cross-framework mapping.</p>
            </div>

            <div className="role">
              <div className="role-header">
                <span className="role-title">Senior Director, IT Risk and Compliance</span>
                <span className="role-dates">Mar 2017 – Jun 2021</span>
              </div>
              <p className="role-desc">Stood up and ran privacy and IT compliance programs — CCPA, GDPR, PCI, ISO 27001, IT-SOX, and business continuity. This is where I really learned how compliance programs work from the ground up.</p>
            </div>

            <div className="role">
              <div className="role-header">
                <span className="role-title">Director, IT Compliance</span>
                <span className="role-dates">Feb 2015 – Mar 2017</span>
              </div>
              <p className="role-desc">Ran the SOX compliance program, working closely with Internal Audit, Controlling, HR, and IT. My first real exposure to how governance and financial reporting risk fit together.</p>
            </div>
          </div>

          <div className="company">
            <h3 className="company-name">Lockheed Martin</h3>
            <p className="company-note">10 years</p>

            <div className="role">
              <div className="role-header">
                <span className="role-title">Software Engineering Manager, Immersive Training</span>
                <span className="role-dates">Feb 2011 – Feb 2015</span>
              </div>
              <p className="role-desc">Ran the product and engineering side of Prepar3D, a flight simulation platform. Touched everything from the technical architecture to patent filings to figuring out commercial licensing — a little bit of everything.</p>
            </div>

            <div className="role">
              <div className="role-header">
                <span className="role-title">Manager, Engineering Leadership Development Program</span>
                <span className="role-dates">Mar 2010 – Feb 2011</span>
              </div>
              <p className="role-desc">Helped train and mentor early-career engineers across the company. One of those roles that taught me more than I probably taught anyone else.</p>
            </div>

            <div className="role">
              <div className="role-header">
                <span className="role-title">Senior Software Engineer</span>
                <span className="role-dates">Dec 2004 – Mar 2010</span>
              </div>
              <p className="role-desc">Where it all started — writing code and leading small teams on simulation and training systems, including work on F-35 readiness systems, biometrics, and logistics automation.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Expertise */}
      <section id="expertise" className="section">
        <div className="section-inner">
          <h2 className="section-heading">Expertise</h2>
          <div className="tags">
            {EXPERTISE_TAGS.map((tag) => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Certifications & Education */}
      <section id="education" className="section section-alt">
        <div className="section-inner">
          <h2 className="section-heading">Certifications & Education</h2>
          <div className="edu-grid">
            <div className="edu-card">
              <h3 className="edu-card-heading">Certifications</h3>
              <div className="cert">
                <span className="cert-name">CISA</span>
                <span className="cert-detail">Certified Information Systems Auditor — ISACA, 2017</span>
              </div>
              <div className="cert">
                <span className="cert-name">CDPSE</span>
                <span className="cert-detail">Certified Data Privacy Solutions Engineer — ISACA, 2020</span>
              </div>
              <div className="cert cert-secondary">
                <span className="cert-detail">OneTrust Certified Data Mapping Expert, 2021</span>
              </div>
              <div className="cert cert-secondary">
                <span className="cert-detail">OneTrust Certified Expert, Data Subject Requests, 2020</span>
              </div>
              <div className="cert cert-secondary">
                <span className="cert-detail">OneTrust Certified Expert, Cookie Consent, 2020</span>
              </div>
              <div className="cert cert-secondary">
                <span className="cert-detail">OneTrust Certified Professional, 2019</span>
              </div>
            </div>
            <div className="edu-card">
              <h3 className="edu-card-heading">Education</h3>
              <div className="edu-item">
                <span className="edu-degree">MBA, Management</span>
                <span className="edu-school">Crummer Graduate School of Business, Rollins College</span>
                <span className="edu-note">Summa Cum Laude. Dr. Claudio Milman Scholarship Award (highest GPA in graduating class). Beta Gamma Sigma.</span>
              </div>
              <div className="edu-item">
                <span className="edu-degree">BS, Computer Engineering & Mathematics</span>
                <span className="edu-school">University of Florida</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Projects & Beyond */}
      <section id="beyond" className="section">
        <div className="section-inner">
          <h2 className="section-heading">Projects</h2>
          <div className="beyond-grid">
            {REPO_CARDS.map((card) => {
              const inner = (
                <>
                  <div className="beyond-header">
                    <h3 className="beyond-title">{card.title}</h3>
                    {card.badge && <span className="beyond-badge">{card.badge}</span>}
                  </div>
                  <p className="beyond-desc">{card.description}</p>
                  {card.href && <span className="beyond-link">View &rarr;</span>}
                </>
              );
              return card.href ? (
                <a key={card.title} href={card.href} className="beyond-card beyond-card-link" target="_blank" rel="noopener noreferrer">
                  {inner}
                </a>
              ) : (
                <div key={card.title} className="beyond-card">
                  {inner}
                </div>
              );
            })}
          </div>

          <div className="beyond-grid" style={{ marginTop: '24px' }}>
            {DEMO_CARDS.map((card) => (
              <Link key={card.title} href={card.href} className="beyond-card beyond-card-link">
                <h3 className="beyond-title">{card.title}</h3>
                <p className="beyond-desc">{card.description}</p>
                <span className="beyond-link">View &rarr;</span>
              </Link>
            ))}
          </div>

          {/* GitHub Activity */}
          <div className="github-activity">
            <div className="github-activity-header">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" style={{ color: '#1f2937' }}>
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span className="github-activity-label">GitHub Activity</span>
              <span className="github-activity-note">Most projects are in private repositories</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://ghchart.rshah.org/1f2937/wbuf81"
              alt="GitHub contribution chart for wbuf81"
              className="github-heatmap"
            />
          </div>

          {/* Interests */}
          <h3 className="subsection-heading">Beyond Work</h3>
          <div className="beyond-grid beyond-grid-narrow">
            {INTEREST_CARDS.map((card) => (
              <div key={card.title} className="beyond-card">
                <h3 className="beyond-title">{card.title}</h3>
                <p className="beyond-desc">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Connect */}
      <section id="connect" className="section section-alt">
        <div className="section-inner">
          <h2 className="section-heading">Connect</h2>
          <p className="connect-text">
            Feel free to reach out.
          </p>
          <div className="connect-links">
            <a href="https://www.linkedin.com/in/wesleybard/" target="_blank" rel="noopener noreferrer" className="connect-btn connect-btn-primary">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              LinkedIn
            </a>
            <a href="https://github.com/wbuf81" target="_blank" rel="noopener noreferrer" className="connect-btn">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <span className="footer-copy">&copy; 2026 Wesley Bard</span>
          <div className="footer-links">
            <a href="https://www.linkedin.com/in/wesleybard/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
            <a href="https://github.com/wbuf81" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
          </div>
        </div>
      </footer>

      <style jsx>{`
        /* Hero */
        .hero {
          padding: 64px 24px;
          background: #fff;
        }
        .hero-inner {
          max-width: 1000px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 48px;
        }
        .hero-text {
          flex: 1;
        }
        .hero-name {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: 3.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
          line-height: 1.1;
        }
        .hero-subtitle {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 1.25rem;
          color: #6b7280;
          margin: 16px 0 0;
          font-weight: 400;
        }
        .hero-headshot {
          flex-shrink: 0;
        }

        /* Sections */
        .section {
          padding: 64px 24px;
        }
        .section-alt {
          background: #fff;
        }
        .section-inner {
          max-width: 1000px;
          margin: 0 auto;
        }
        .section-heading {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: 2rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 24px;
        }

        /* About */
        .about-text {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 1.1rem;
          line-height: 1.8;
          color: #374151;
          max-width: 800px;
        }

        /* Experience */
        .company {
          margin-bottom: 36px;
        }
        .company:last-child {
          margin-bottom: 0;
        }
        .company-name {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 1.3rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
        }
        .company-note {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.9rem;
          color: #9ca3af;
          margin: 4px 0 24px;
        }
        .role {
          margin-bottom: 24px;
          padding-left: 20px;
          border-left: 2px solid #e5e7eb;
        }
        .role:last-child {
          margin-bottom: 0;
        }
        .role-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 6px;
        }
        .role-title {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 1.05rem;
          font-weight: 600;
          color: #1f2937;
        }
        .role-dates {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.85rem;
          color: #9ca3af;
          white-space: nowrap;
        }
        .role-desc {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.95rem;
          line-height: 1.6;
          color: #6b7280;
          margin: 0;
        }

        /* Expertise Tags */
        .tags {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .tag {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.85rem;
          font-weight: 500;
          color: #374151;
          background: #fff;
          border: 1px solid #e5e7eb;
          padding: 8px 16px;
          border-radius: 20px;
        }

        /* Education & Certs */
        .edu-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }
        .edu-card {
          background: #fafafa;
          border-radius: 16px;
          padding: 32px;
          border: 1px solid #f3f4f6;
        }
        .edu-card-heading {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 1.1rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 20px;
        }
        .cert {
          margin-bottom: 16px;
        }
        .cert:last-child {
          margin-bottom: 0;
        }
        .cert-name {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
          display: block;
        }
        .cert-detail {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.85rem;
          color: #6b7280;
          display: block;
          margin-top: 2px;
        }
        .cert-secondary {
          margin-bottom: 8px;
        }
        .cert-secondary .cert-detail {
          font-size: 0.8rem;
          color: #9ca3af;
        }
        .edu-item {
          margin-bottom: 20px;
        }
        .edu-item:last-child {
          margin-bottom: 0;
        }
        .edu-degree {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
          display: block;
        }
        .edu-school {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.9rem;
          color: #6b7280;
          display: block;
          margin-top: 2px;
        }
        .edu-note {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.8rem;
          color: #9ca3af;
          display: block;
          margin-top: 4px;
          line-height: 1.5;
        }

        /* Projects & Beyond */
        .beyond-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }
        .beyond-grid-narrow {
          margin-top: 0;
        }
        .beyond-card {
          background: #fff;
          border-radius: 16px;
          padding: 28px;
          border: 1px solid #f3f4f6;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .beyond-card-link {
          text-decoration: none;
          cursor: pointer;
        }
        .beyond-card-link:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
        }
        .beyond-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        .beyond-title {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 1.05rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }
        .beyond-badge {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.7rem;
          font-weight: 500;
          color: #6b7280;
          background: #f3f4f6;
          padding: 3px 8px;
          border-radius: 4px;
          white-space: nowrap;
        }
        .beyond-desc {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.9rem;
          line-height: 1.6;
          color: #6b7280;
          margin: 0;
        }
        .beyond-link {
          display: inline-block;
          margin-top: 12px;
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.85rem;
          font-weight: 500;
          color: #2563eb;
        }
        .subsection-heading {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 36px 0 20px;
        }
        .github-activity {
          margin-top: 32px;
          background: #fff;
          border-radius: 16px;
          padding: 28px;
          border: 1px solid #f3f4f6;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }
        .github-activity-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }
        .github-activity-label {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 1.05rem;
          font-weight: 600;
          color: #1f2937;
        }
        .github-activity-note {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.8rem;
          color: #9ca3af;
          margin-left: auto;
        }
        .github-heatmap {
          width: 100%;
          height: auto;
          border-radius: 8px;
        }

        /* Connect */
        .connect-text {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 1.1rem;
          line-height: 1.7;
          color: #374151;
          margin: 0 0 20px;
          max-width: 600px;
        }
        .connect-links {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        .connect-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.95rem;
          font-weight: 500;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          color: #374151;
          background: #f3f4f6;
          transition: background 0.2s ease;
        }
        .connect-btn:hover {
          background: #e5e7eb;
          text-decoration: none;
        }
        .connect-btn-primary {
          background: #0a66c2;
          color: #fff;
        }
        .connect-btn-primary:hover {
          background: #004182;
        }

        /* Footer */
        .footer {
          padding: 32px 24px;
          border-top: 1px solid #e5e7eb;
        }
        .footer-inner {
          max-width: 1000px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .footer-copy {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.85rem;
          color: #9ca3af;
        }
        .footer-links {
          display: flex;
          gap: 16px;
        }
        .footer-links a {
          color: #9ca3af;
          transition: color 0.2s ease;
        }
        .footer-links a:hover {
          color: #1f2937;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .hero {
            padding: 48px 24px;
          }
          .hero-inner {
            flex-direction: column-reverse;
            text-align: center;
            gap: 32px;
          }
          .hero-name {
            font-size: 2.5rem;
          }
          .hero-subtitle {
            font-size: 1.05rem;
          }
          .section {
            padding: 40px 24px;
          }
          .edu-grid {
            grid-template-columns: 1fr;
          }
          .beyond-grid {
            grid-template-columns: 1fr;
          }
          .role-header {
            flex-direction: column;
            gap: 2px;
          }
        }

        @media (max-width: 480px) {
          .hero {
            padding: 32px 16px;
          }
          .hero-name {
            font-size: 2rem;
          }
          .section {
            padding: 32px 16px;
          }
          .section-heading {
            font-size: 1.5rem;
          }
          .edu-card {
            padding: 24px;
          }
          .beyond-card {
            padding: 20px;
          }
          .footer-inner {
            flex-direction: column;
            gap: 16px;
            text-align: center;
          }
        }
      `}</style>
    </>
  );
}
