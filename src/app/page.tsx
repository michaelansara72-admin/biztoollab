const tools = [
  {
  title: "Laundromat Profit Calculator",
  description:
    "Estimate monthly revenue, operating expenses, profit margin, annual profit, and return on investment.",
  category: "Industry Calculator",
  href: "/calculators/laundromat-profit-calculator",
},
  {
    title: "Vending Machine Profit Calculator",
    description:
      "Estimate sales, product costs, commissions, operating expenses, and expected monthly profit.",
    category: "Industry Calculator",
    href: "/calculators/vending-machine-profit-calculator",
  },
  {
    title: "Startup Cost Calculator",
    description:
      "Organize one-time startup expenses and estimate how much capital you may need before launch.",
    category: "Startup Tool",
  },
  {
    title: "Break-Even Calculator",
    description:
      "Calculate the sales volume or revenue required to cover your fixed and variable costs.",
    category: "Business Calculator",
  },
  {
    title: "Profit Margin Calculator",
    description:
      "Quickly calculate gross profit, margin percentage, markup, and selling price.",
    category: "Business Calculator",
  },
  {
    title: "ROI Calculator",
    description:
      "Compare your investment against expected gains and calculate your estimated return.",
    category: "Finance Tool",
  },
];

const categories = [
  "Business Calculators",
  "Industry Calculators",
  "Startup Tools",
  "Finance Tools",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <div className="text-2xl font-bold tracking-tight">
              BizToolLab
            </div>
            <div className="text-sm text-slate-500">
              Smart tools for smarter business decisions
            </div>
          </div>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-700 md:flex">
            <a href="#tools" className="hover:text-slate-950">
              Tools
            </a>
            <a href="#categories" className="hover:text-slate-950">
              Categories
            </a>
            <a href="#about" className="hover:text-slate-950">
              About
            </a>
          </nav>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-24 text-center">
          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
            Free calculators and practical business tools
          </span>

          <h1 className="mx-auto mt-8 max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl">
            Make better business decisions with simple, useful tools.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            BizToolLab helps entrepreneurs, small-business owners, and side
            hustlers estimate costs, calculate profits, compare opportunities,
            and make more informed decisions.
          </p>

          <div className="mx-auto mt-10 max-w-2xl">
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row">
              <input
                type="text"
                placeholder="Search calculators and business tools..."
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
              />
              <button className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-700">
                Search Tools
              </button>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm text-slate-500">
            <span>Popular:</span>
            <a href="#tools" className="font-medium text-slate-700 hover:text-slate-950">
              Profit Margin
            </a>
            <a href="#tools" className="font-medium text-slate-700 hover:text-slate-950">
              Break-Even
            </a>
            <a href="#tools" className="font-medium text-slate-700 hover:text-slate-950">
              Startup Costs
            </a>
            <a href="#tools" className="font-medium text-slate-700 hover:text-slate-950">
              Laundromat Profit
            </a>
          </div>
        </div>
      </section>

      <section id="categories" className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Browse by category
          </p>
          <h2 className="mt-2 text-3xl font-bold">
            Find the right tool for your decision
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <div
              key={category}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <h3 className="text-lg font-semibold">{category}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Practical tools designed to help you evaluate business
                opportunities and financial decisions.
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="tools" className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Featured tools
              </p>
              <h2 className="mt-2 text-3xl font-bold">
                Start with one of our business calculators
              </h2>
            </div>

            <span className="text-sm text-slate-500">
              More tools coming soon
            </span>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => (
              <article
                key={tool.title}
                className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-6 transition hover:-translate-y-1 hover:bg-white hover:shadow-md"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {tool.category}
                </span>

                <h3 className="mt-3 text-xl font-semibold">
                  {tool.title}
                </h3>

                <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">
                  {tool.description}
                </p>

                {tool.href ? (
  <a
    href={tool.href}
    className="mt-6 text-left text-sm font-semibold text-slate-900 hover:text-slate-600"
  >
    Open tool →
  </a>
) : (
  <span className="mt-6 text-left text-sm font-semibold text-slate-400">
    Coming soon
  </span>
)}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Why BizToolLab
            </p>

            <h2 className="mt-3 text-4xl font-bold tracking-tight">
              Business numbers should be easier to understand.
            </h2>

            <p className="mt-6 text-lg leading-8 text-slate-600">
              Our goal is to turn common business calculations into clear,
              practical tools that anyone can use without complicated
              spreadsheets or expensive software.
            </p>
          </div>

          <div className="grid gap-4">
            {[
              "Free tools with no account required",
              "Clear calculations and understandable results",
              "Designed for entrepreneurs and small businesses",
              "New calculators and utilities added regularly",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <span className="font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-dashed border-slate-300 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
              Future advertising space
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Reserved for a future Google AdSense placement.
            </p>
          </div>
        </div>
      </section>

      <footer className="bg-slate-950 text-slate-300">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-col justify-between gap-6 sm:flex-row">
            <div>
              <div className="text-lg font-semibold text-white">
                BizToolLab
              </div>
              <p className="mt-2 text-sm text-slate-400">
                Smart tools for smarter business decisions.
              </p>
            </div>

            <div className="flex flex-wrap gap-6 text-sm">
  <a href="/about" className="hover:text-white">
    About
  </a>
  <a href="/privacy" className="hover:text-white">
    Privacy
  </a>
  <a href="/terms" className="hover:text-white">
    Terms
  </a>
  <a href="/contact" className="hover:text-white">
    Contact
  </a>
</div>
          </div>

          <div className="mt-8 border-t border-slate-800 pt-6 text-sm text-slate-500">
            © 2026 BizToolLab. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}