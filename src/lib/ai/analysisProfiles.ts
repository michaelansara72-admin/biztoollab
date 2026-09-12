export type AnalysisType =
  | "business-opportunity"
  | "scenario-comparison"
  | "profitability-diagnosis";

const scenarioComparisonInstructions = `
For scenario comparison analysis:

1. Compare the supplied Conservative, Expected, and Strong scenarios directly.
2. Focus on how changes in retail car volume affect revenue, profit, profit margin, and ROI.
3. Identify how resilient the business appears if retail traffic underperforms.
4. Point out the downside risk between the Expected and Conservative scenarios.
5. Identify whether retail traffic appears to be a major business sensitivity based only on the supplied scenario results.
6. Recommend one practical scenario the user should test next.
7. Do not invent new scenario results or calculate values that were not supplied.
8. Review the supplied sensitivity results for retail traffic, wash price, membership count, labor cost, and property cost.
9. Compare the profit and ROI impact of a 10% decrease and a 10% increase for each variable.
10. Identify which variable appears to have the greatest impact on business performance based only on the supplied sensitivity results.
11. Distinguish between revenue-side sensitivities and expense-side sensitivities.
12. Do not calculate new sensitivity values; interpret only the supplied sensitivity results.
13. Use the supplied sensitivityRanking as the source of truth for the order of business drivers.
14. Do not create a different ranking from your own interpretation.
15. When discussing the strongest and weakest drivers, reference the ranking supplied by the calculator.
16. Explain the ranking in plain English and connect the top-ranked drivers to the most useful scenario to test next.
17. Review the supplied combinedDownsideScenario as an already-calculated scenario.
18. Treat combinedDownsideScenario as the source of truth for the combined lower-traffic and lower-wash-price stress test.
19. Do not say that the combined downside scenario still needs to be calculated if combinedDownsideScenario is present.
20. Compare the combined downside result with the Expected and Conservative scenarios using only the supplied values.
21. Explain whether the business remains resilient under the combined downside case and identify the practical implication for the user.
22. Review the supplied combinedUpsideScenario as an already-calculated scenario.
23. Treat combinedUpsideScenario as the source of truth for the combined higher-traffic and higher-wash-price opportunity case.
24. Compare the combined upside result with the Expected and Strong scenarios using only the supplied values.
25. Explain how much additional upside exists when the two highest-ranked drivers improve together.
26. Do not imply that the combined upside result is guaranteed; describe it as an estimate based on the supplied assumptions.
27. If customScenario is present, you MUST explicitly discuss it in the final analysis, including its monthly profit and annual ROI, and compare it directly with the Expected scenario.
28. Treat customScenario as the source of truth for the user's custom combination of traffic, wash price, membership count, labor cost, and property cost.
29. Use the supplied custom input values to explain what changed from the Expected scenario.
30. Compare the custom scenario with the Expected scenario using only the supplied calculator results.
31. Identify the most important improvement or deterioration in the custom scenario and explain its practical business impact.
32. Do not recalculate the custom scenario or invent additional custom values.
`;

const profitabilityDiagnosisInstructions = `
For profitability diagnosis:

1. Diagnose the supplied business results rather than merely summarizing them.
2. Identify the strongest apparent driver of profitability using only the supplied calculator data.
3. Identify the largest apparent vulnerability or pressure point.
4. Separate revenue-side drivers from expense-side drivers when the supplied data allows it.
5. If a sensitivity ranking is supplied, treat that ranking as the source of truth.
6. Do not create a different ranking from your own interpretation.
7. Explain why the highest-ranked driver matters in practical business terms.
8. Identify whether the business appears highly dependent on one assumption or reasonably balanced across several assumptions.
9. Review profit, profit margin, ROI, payback, break-even information, and scenario results when supplied.
10. Highlight any result that suggests the business could remain profitable while still becoming materially less attractive.
11. Distinguish between profitability and resilience. A profitable scenario is not automatically a resilient scenario.
12. Identify the single variable or assumption that deserves validation first.
13. Recommend one practical test the user can perform with the calculator next.
14. Do not invent benchmarks, target margins, industry averages, market demand, costs, or other external information.
15. Do not recalculate values or create values that were not supplied.
16. Base every diagnosis on the calculator inputs and results provided.
17. If the supplied information is insufficient to diagnose a particular issue, clearly state that limitation.
18. Keep the diagnosis decision-oriented: explain what matters, why it matters, and what the user should investigate next.
`;

const analysisProfiles: Record<AnalysisType, string> = {
  "business-opportunity": "",
  "scenario-comparison": scenarioComparisonInstructions,
  "profitability-diagnosis": profitabilityDiagnosisInstructions,
};

export function getAnalysisProfile(
  analysisType?: string
): string {
  if (!analysisType) {
    return analysisProfiles["business-opportunity"];
  }

  if (analysisType in analysisProfiles) {
    return analysisProfiles[analysisType as AnalysisType];
  }

  return analysisProfiles["business-opportunity"];
}