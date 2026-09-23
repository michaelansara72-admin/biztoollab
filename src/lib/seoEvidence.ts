import { createHash } from "node:crypto";

export type SeoEvidenceQuery = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type SeoEvidencePage = {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type SeoEvidence = {
  siteUrl: string;

  period: {
    startDate: string;
    endDate: string;
  };

  metrics: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };

  queries: SeoEvidenceQuery[];
  pages: SeoEvidencePage[];
};
function validateSeoEvidence(evidence: SeoEvidence): void {
  const metrics = [
    evidence.metrics,
    ...evidence.queries,
    ...evidence.pages,
  ];

  for (const row of metrics) {
    for (const field of [
      "clicks",
      "impressions",
      "ctr",
      "position",
    ] as const) {
      if (!Number.isFinite(row[field])) {
        throw new Error(
          `SEO evidence ${field} must be a finite number.`
        );
      }
    }
  }
}
export function serializeSeoEvidence(
  evidence: SeoEvidence
): string {validateSeoEvidence(evidence);
  return JSON.stringify({
    siteUrl: evidence.siteUrl,

    period: {
      startDate: evidence.period.startDate,
      endDate: evidence.period.endDate,
    },

    metrics: {
      clicks: evidence.metrics.clicks,
      impressions: evidence.metrics.impressions,
      ctr: evidence.metrics.ctr,
      position: evidence.metrics.position,
    },

    queries: evidence.queries.map((row) => ({
      query: row.query,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    })),

    pages: evidence.pages.map((row) => ({
      page: row.page,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    })),
  });
}

export function createSeoEvidenceFingerprint(
  evidence: SeoEvidence
): string {
  return createHash("sha256")
    .update(serializeSeoEvidence(evidence), "utf8")
    .digest("hex");
}
