import Link from 'next/link';
import { MapPin } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy',
  description: 'Trip Planner privacy policy — how we handle your data.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-bg text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-12 max-w-[800px] items-center gap-2 px-6">
          <Link href="/" className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[1px]">
            <MapPin size={14} className="text-accent" />
            Trip Planner
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[800px] px-6 py-12">
        <h1
          className="text-[32px] font-bold tracking-[-1px]"
          style={{ fontFamily: 'var(--font-space-grotesk)' }}
        >
          Privacy Policy
        </h1>
        <p className="mt-2 text-[13px] text-muted">Last updated: March 2026</p>

        <div className="mt-8 space-y-8 text-[13px] leading-relaxed text-foreground-secondary">
          <section>
            <h2 className="mb-3 text-[15px] font-semibold text-foreground">1. What We Collect</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Account data:</strong> email address (for passwordless authentication via magic link).</li>
              <li><strong>Trip data:</strong> trip names, dates, city legs, planner entries, pair rooms, and configuration you create in the app.</li>
              <li><strong>Usage analytics:</strong> page views and basic interaction data via Vercel Analytics — only when you accept cookies.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-[15px] font-semibold text-foreground">2. How We Use Your Data</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Authenticate you and protect your account.</li>
              <li>Store and display your trip plans, events, spots, and planner schedules.</li>
              <li>Improve the product through anonymized analytics (with your consent).</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-[15px] font-semibold text-foreground">3. Third-Party Services</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Convex:</strong> real-time database and serverless backend (stores your trip data).</li>
              <li><strong>Resend:</strong> sends magic-link authentication emails.</li>
              <li><strong>Google Maps API:</strong> map display, geocoding, and route computation.</li>
              <li><strong>Vercel Analytics:</strong> privacy-friendly web analytics (consent-gated).</li>
              <li><strong>City open data portals:</strong> crime heatmap data from official public safety datasets. No personal data is sent to these services.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-[15px] font-semibold text-foreground">4. Cookies</h2>
            <p>
              We use essential cookies for authentication (session tokens). Analytics cookies are only
              loaded after you explicitly accept via the cookie consent banner. You can change your
              preference at any time by clearing your browser storage.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[15px] font-semibold text-foreground">5. Data Retention</h2>
            <p>
              Your trip data is stored as long as your account exists. You can export all your data or
              delete your account at any time through the app settings or the API.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[15px] font-semibold text-foreground">6. Your Rights (GDPR)</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Access:</strong> export all your data via <code className="bg-card px-1 py-0.5 text-accent">GET /api/me/data</code>.</li>
              <li><strong>Deletion:</strong> delete your account and all associated data via <code className="bg-card px-1 py-0.5 text-accent">DELETE /api/me/delete</code>.</li>
              <li><strong>Portability:</strong> exported data is provided in JSON format.</li>
              <li><strong>Withdraw consent:</strong> decline cookies at any time; analytics will stop loading.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-[15px] font-semibold text-foreground">7. Contact</h2>
            <p>
              For privacy questions, open an issue on the{' '}
              <a
                href="https://github.com/madeyexz/SF_trip"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-2"
              >
                GitHub repository
              </a>{' '}
              or email the project maintainer.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
