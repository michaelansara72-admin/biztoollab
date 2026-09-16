type GovernanceDecisionBriefProps = {
  siteMetrics: {
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
  };

  period: {
    startDate: string;
    endDate: string;
  };

  analysis: {
    summary: string;
    evidenceAssessment: string;
    opportunity: string;
    evidence: string;
    recommendation: string;
    experiment: string;
    measurement: string;
    confidence: "low" | "moderate" | "high";
    governanceStatus:
      | "monitor-longer"
      | "candidate-experiment";
  };
};

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatConfidence(
  confidence: GovernanceDecisionBriefProps["analysis"]["confidence"]
) {
  return (
    confidence.charAt(0).toUpperCase() +
    confidence.slice(1)
  );
}

function formatGovernanceStatus(
  status: GovernanceDecisionBriefProps["analysis"]["governanceStatus"]
) {
  if (status === "candidate-experiment") {
    return "Candidate Experiment";
  }

  return "Monitor Longer";
}

function determineCurrentStage({
  impressions,
  clicks,
}: GovernanceDecisionBriefProps["siteMetrics"]) {
  if (impressions === 0) {
    return {
      stage: "Awaiting Organic Discovery",
      explanation:
        "Search visibility has not yet produced measurable impressions during this reporting period.",
    };
  }

  if (clicks === 0) {
    return {
      stage: "Early Organic Discovery",
      explanation:
        "Google is displaying BizToolLab in search results, but the available evidence has not yet produced recorded organic clicks.",
    };
  }

  return {
    stage: "Early Organic Engagement",
    explanation:
      "BizToolLab is receiving both search impressions and organic clicks. Continued evidence is needed before drawing conclusions about sustained traffic or business performance.",
  };
}

export default function GovernanceDecisionBrief({
  siteMetrics,
  period,
  analysis,
}: GovernanceDecisionBriefProps) {
  const currentStage = determineCurrentStage(siteMetrics);

  return (
    <section
      style={{
        marginTop: "24px",
        border: "1px solid #d1d5db",
        borderRadius: "16px",
        padding: "24px",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#6b7280",
            }}
          >
            Human Governance
          </p>

          <h2
            style={{
              marginTop: "6px",
              marginBottom: "8px",
              fontSize: "24px",
            }}
          >
            AI Recommendation Decision Brief
          </h2>

          <p
            style={{
              margin: 0,
              color: "#4b5563",
              maxWidth: "760px",
              lineHeight: 1.6,
            }}
          >
            Understand the current state of BizToolLab,
            the evidence behind the AI recommendation,
            and what would actually be tested before
            making a governance decision.
          </p>
        </div>

        <div
          style={{
            padding: "8px 12px",
            borderRadius: "999px",
            background: "#f3f4f6",
            fontSize: "13px",
            fontWeight: 700,
          }}
        >
          {formatGovernanceStatus(
            analysis.governanceStatus
          )}
        </div>
      </div>

      {/* Executive Decision Summary */}
      <div
        style={{
          marginTop: "24px",
          border: "1px solid #cbd5e1",
          borderRadius: "14px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "18px 20px",
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#64748b",
            }}
          >
            Executive Decision Summary
          </p>

          <h3
            style={{
              marginTop: "6px",
              marginBottom: 0,
              fontSize: "21px",
            }}
          >
            {currentStage.stage}
          </h3>
        </div>

        <div
          style={{
            padding: "20px",
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "22px",
          }}
        >
          <ExecutiveItem
            title="What Is Happening"
            text={currentStage.explanation}
          />

          <ExecutiveItem
            title="What The Evidence Means"
            text={analysis.summary}
          />

          <ExecutiveItem
            title="Why Action Is Being Considered"
            text={analysis.opportunity}
          />

          <ExecutiveItem
            title="What We Would Test"
            text={analysis.experiment}
          />

          <ExecutiveItem
            title="What Success Would Mean"
            text={
              "We are not assuming that the proposed change will increase traffic. The experiment would look for measurable directional improvement using the evidence and metrics defined in the measurement plan."
            }
          />

          <div>
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#64748b",
              }}
            >
              Decision Status
            </p>

            <p
              style={{
                marginTop: "7px",
                marginBottom: "4px",
                fontSize: "18px",
                fontWeight: 700,
              }}
            >
              {formatGovernanceStatus(
                analysis.governanceStatus
              )}
            </p>

            <p
              style={{
                margin: 0,
                lineHeight: 1.6,
                color: "#475569",
              }}
            >
              AI confidence:{" "}
              <strong>
                {formatConfidence(analysis.confidence)}
              </strong>
              . No production change has been authorized.
            </p>
          </div>
        </div>
      </div>

      {/* Current Site Evidence */}
      <div
        style={{
          marginTop: "24px",
          padding: "18px",
          background: "#f9fafb",
          borderRadius: "12px",
        }}
      >
        <h3 style={{ marginTop: 0 }}>
          Current Site Evidence
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "16px",
          }}
        >
          <Metric
            label="Impressions"
            value={siteMetrics.impressions.toLocaleString()}
          />

          <Metric
            label="Clicks"
            value={siteMetrics.clicks.toLocaleString()}
          />

          <Metric
            label="CTR"
            value={formatPercent(siteMetrics.ctr)}
          />

          <Metric
            label="Average Position"
            value={siteMetrics.position.toFixed(1)}
          />
        </div>

        <p
          style={{
            marginBottom: 0,
            marginTop: "16px",
            fontSize: "13px",
            color: "#6b7280",
          }}
        >
          Evidence window: {period.startDate} through{" "}
          {period.endDate}
        </p>
      </div>

      <div
        style={{
          marginTop: "24px",
          marginBottom: "10px",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#64748b",
          }}
        >
          Supporting Evidence
        </p>

        <h3
          style={{
            marginTop: "5px",
            marginBottom: 0,
            fontSize: "19px",
          }}
        >
          Detailed Analysis
        </h3>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "18px",
        }}
      >
        <BriefSection
          title="Overall Assessment"
          text={analysis.summary}
        />

        <BriefSection
          title="Evidence Assessment"
          text={analysis.evidenceAssessment}
        />

        <BriefSection
          title="Opportunity Identified"
          text={analysis.opportunity}
        />

        <BriefSection
          title="Observed Evidence"
          text={analysis.evidence}
        />

        <BriefSection
          title="AI Recommendation"
          text={analysis.recommendation}
        />

        <BriefSection
          title="Proposed Experiment"
          text={analysis.experiment}
        />

        <BriefSection
          title="How We Will Measure It"
          text={analysis.measurement}
        />

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "18px",
          }}
        >
          <h3
            style={{
              marginTop: 0,
              marginBottom: "10px",
              fontSize: "16px",
            }}
          >
            AI Confidence
          </h3>

          <div
            style={{
              fontSize: "22px",
              fontWeight: 700,
            }}
          >
            {formatConfidence(analysis.confidence)}
          </div>

          <p
            style={{
              marginBottom: 0,
              color: "#6b7280",
              lineHeight: 1.6,
            }}
          >
            Confidence describes the strength of the
            available evidence. It is not authorization to
            make a production change.
          </p>
        </div>
      </div>

      <div
        style={{
          marginTop: "20px",
          padding: "18px",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          background: "#f9fafb",
        }}
      >
        <h3
          style={{
            marginTop: 0,
            marginBottom: "8px",
          }}
        >
          Governance Checkpoint
        </h3>

        <p
          style={{
            margin: 0,
            lineHeight: 1.6,
            color: "#4b5563",
          }}
        >
          No production change has been authorized. This
          brief exists so the administrator can evaluate the
          evidence before choosing to review an experiment,
          monitor longer, modify the proposal, or reject it.
        </p>
      </div>
    </section>
  );
}

function ExecutiveItem({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div>
      <p
        style={{
          margin: 0,
          fontSize: "12px",
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "#64748b",
        }}
      >
        {title}
      </p>

      <p
        style={{
          marginTop: "7px",
          marginBottom: 0,
          lineHeight: 1.65,
          color: "#334155",
        }}
      >
        {text}
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: "12px",
          color: "#6b7280",
        }}
      >
        {label}
      </div>

      <strong style={{ fontSize: "22px" }}>
        {value}
      </strong>
    </div>
  );
}

function BriefSection({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "18px",
      }}
    >
      <h3
        style={{
          marginTop: 0,
          marginBottom: "10px",
          fontSize: "16px",
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin: 0,
          color: "#4b5563",
          lineHeight: 1.65,
          whiteSpace: "pre-line",
        }}
      >
        {text}
      </p>
    </div>
  );
}