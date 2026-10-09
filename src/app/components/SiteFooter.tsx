const footerLinks = [
  { href: "/", label: "Home" },
  { href: "/calculators", label: "Calculators" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

export default function SiteFooter() {
  return (
    <footer className="bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col justify-between gap-6 sm:flex-row">
          <div>
            <p className="text-lg font-semibold text-white">
              BizToolLab
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Smart tools for smarter business decisions.
            </p>
          </div>

          <nav
            aria-label="Footer"
            className="flex flex-wrap gap-x-6 gap-y-3 text-sm"
          >
            {footerLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-8 border-t border-slate-800 pt-6 text-sm text-slate-500">
          © 2026 BizToolLab. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
