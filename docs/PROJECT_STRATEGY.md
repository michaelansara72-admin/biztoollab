# BizToolLab Project Strategy

**Owner:** Synergy Media & Tech LLC
**Product:** BizToolLab
**Status:** Existing live production website
**Audience:** Future development sessions, agents, architectural reviews, and sprint planning

This document is a standing source of project guidance. It supplements existing engineering standards. It does not replace them.

BizToolLab is a live production website. It is not a prototype. Public pages, calculators, content, and the authenticated admin experience are already in service. Work on the repository must protect that production system while the product continues to grow.

## 1. Live Production Protection

Protect existing public URLs, calculators, functionality, content, and user experience.

The public site includes the homepage, calculator index, individual calculators, and supporting pages such as About, Contact, Privacy, and Terms. The admin area is a private operating surface. Changes that affect either surface must preserve behavior that users and search engines already rely on.

Local development is not production. A change on a developer machine, in a branch, or in an uncommitted working tree is not live until it has been deliberately released. Do not describe local work as deployed.

Treat these as separate operations:

- Local implementation
- Automated testing and other verification
- Git commit
- Push to a remote
- Database migration
- Production deployment

Completing one operation does not authorize the next. Never push or deploy without explicit user authorization.

Prefer incremental, tested, reversible changes. Before a public-facing change, consider:

- Backward compatibility for existing URLs, data, and workflows
- Security of public pages and the admin area
- Performance, especially on mobile
- SEO, including titles, descriptions, headings, canonicals, internal links, and indexability
- Indexing effects, including whether a change could add, remove, or reshuffle pages in search results

If a change can affect a live URL or a live database, identify the rollback path before the change is released.

## 2. Active Google Search Console Traffic Testing

BizToolLab is currently testing and monitoring organic search traffic through Google Search Console. This initiative is ongoing. It must remain visible during future sprint planning.

Preserve the integrity of traffic measurements. Avoid unnecessary URL, redirect, canonical, indexing, or content changes that could interfere with testing. A change that renames a public path, adds a redirect, alters a canonical, changes indexation, or substantially rewrites a measured page needs an explicit reason and a note about how it may affect the test.

When actual Search Console data is available, evaluate:

- Impressions
- Clicks
- Click-through rate (CTR)
- Average position
- Indexing
- Page-level performance

Distinguish observed evidence from hypotheses. A metric that was queried and recorded is evidence. An explanation of why that metric moved is a hypothesis until the data supports it. Never invent metrics, and never assume access to live Search Console data. If current data is not in hand, say so and do not fill the gap with estimated numbers.

Recorded evidence for 2026-09-06 through 2026-10-03: the Car Wash calculator returned 32 query rows, and the Vending Machine calculator returned 18 query rows. The returned query rows had zero clicks. Page-filtered query rows and page-level impression totals come from separate Search Analytics requests and are not additive. This note records that observation. It does not set a standing target.

## 3. SEO and Monetization Readiness

SEO and AdSense are permanent strategic priorities. They are not the primary focus of every engineering sprint.

Build toward:

- Sustainable organic growth
- AdSense readiness
- Other revenue opportunities that fit the product and its audience

Relevant work includes useful original content, technical SEO, mobile usability, performance, metadata, crawlability, internal linking, and user trust. Public pages should be understandable, fast, and worth returning to.

Do not sacrifice product quality or credibility to generate traffic or advertising revenue. Calculators and other tools should remain accurate and useful. Advertising, if introduced, must not obscure the tool, mislead the user, or weaken trust in the business.

## 4. Two Parallel Workstreams

BizToolLab has two standing workstreams. Neither may be silently abandoned.

### Product Engineering

Build, test, secure, and improve the platform. This includes application behavior, admin governance, data integrity, authentication, and operational reliability.

### Traffic and Revenue Readiness

Monitor organic visibility, improve public-facing value, identify growth opportunities, and prepare for monetization. This includes Search Console review, content quality, technical SEO, and revenue readiness.

A sprint may concentrate on one workstream. The sprint plan must still acknowledge the other. If the inactive workstream needs no action in that sprint, say so. Do not drop it from planning without that acknowledgment.

## 5. Mandatory Sprint Planning Checklist

For each significant proposed sprint, explicitly consider every item below.

1. **Live production protection.** What existing public or admin behavior could change, and how will it be preserved?
2. **Search and measurement impact.** What is the effect on public URLs, SEO, indexing, and the active Search Console test?
3. **User value, security, and trust.** Who benefits, and what trust or security boundary is involved?
4. **Business and revenue alignment.** How does the sprint support the long-term product, or why is it necessary infrastructure for that product?
5. **Incremental implementation and verification.** What is the smallest reversible slice, and how will it be tested before any release step?
6. **Release authorization.** Does the sprint require a database migration, a push, or a production deployment? If it does, that step stays unauthorized until the user explicitly approves it.

If a sprint has no direct SEO or monetization impact, state that. Do not invent a connection to search traffic or revenue.

## 6. Release and Verification Discipline

Keep these steps separate:

1. Local implementation
2. Automated testing and other non-production verification
3. Git commit
4. Push
5. Database migration
6. Production deployment

Explicit user authorization is required before a push or a production deployment. A request to implement, test, or commit is not authorization to push or deploy. A request to prepare a migration is not authorization to run it against a live database.

Before a release that can affect production behavior or indexing, document:

- Which public URLs or admin workflows can change
- Whether indexing, canonicals, redirects, or page content can change
- Whether a database migration is required and whether it is reversible
- How the change can be rolled back

Preserve rollback options. Prefer migrations and releases that can be reversed without destroying production data or measured URLs.

## 7. Continuity

Use this document in future development sessions, agent work, architectural reviews, and sprint planning.

When a proposed change conflicts with this strategy, stop and surface the conflict. Do not quietly override live-site protection, Search Console integrity, or the separation between local work and production release.

This strategy supplements the repository’s engineering standards, including implementation, testing, and review practices. Those standards still govern how code is written and verified. This document governs how that work is planned, sequenced, and released for a live business.

Review this document when planning a significant sprint. Update it only when the business deliberately changes a standing requirement. Do not create a second copy elsewhere.
