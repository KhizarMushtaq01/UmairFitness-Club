// src/app/(marketing)/cookies/page.tsx
import { PolicyPage } from "@/components/marketing/PolicyPage";

function H({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[24px] tracking-[.06em] text-[var(--txt)]">
      {children}
    </h2>
  );
}

export default function CookiesPage() {
  return (
    <PolicyPage title="COOKIE POLICY" updated="14 August 2026">
      <p>
        A cookie is a small file a website stores in your browser. This page
        lists what this site uses and why.
      </p>

      <H>What we use</H>
      <p>
        One cookie, and it is essential: a session cookie set when you sign in,
        which is how the site knows it is still you as you move between pages.
        It is removed when the session expires or you sign out. Without it you
        could not stay signed in.
      </p>

      <H>What we do not use</H>
      <p>
        We set no advertising cookies, no cross-site trackers, and no
        third-party analytics cookies. Nothing on this site follows you to
        other websites.
      </p>

      <H>Managing cookies</H>
      <p>
        Your browser can block or delete cookies through its settings. Blocking
        the session cookie will prevent you from signing in to a member,
        coach, or admin dashboard, because the site would have no way to
        recognise you between requests.
      </p>

      <H>Changes</H>
      <p>
        If we add a cookie — for example if we introduce analytics — we will
        update this page and, where the law requires it, ask your consent
        first.
      </p>
    </PolicyPage>
  );
}
