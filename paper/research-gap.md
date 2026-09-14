# Research Problem Framing & Research Gap Analysis

**Project:** Proactive Civic Complaint Forecasting with Resource-Constrained Verification and Feedback  
**Target Domain:** Civic/Municipal Operations, Spatiotemporal Machine Learning, and Resource-Constrained Decision Support  

---

## 1. Problem Formulation Hierarchy

```
+---------------------------------------------------------------------------------------------------+
| 1. PRACTICAL PROBLEM (Municipal Operations & Urban Governance)                                    |
| Municipal 311 systems operate reactively: city agencies respond to infrastructure failures        |
| (potholes, lighting outages, rodent infestations) only after citizen complaints accumulate. This  |
| leads to maintenance backlogs, severe spatial disparities in service delivery, and compounding   |
| infrastructure degradation in underreporting neighborhoods.                                       |
+---------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+---------------------------------------------------------------------------------------------------+
| 2. TECHNICAL PROBLEM (Computational & Statistical Hardness)                                      |
| (a) Extreme spatiotemporal heterogeneity, non-stationarity, and seasonality across urban areas.   |
| (b) Severe resource constraints: municipal inspector capacity is limited to a small fraction      |
|     (5–20%) of weekly candidate regions.                                                          |
| (c) Feedback-selection bias (Selective Labels): dispatching inspectors strictly to highest-risk   |
|     predicted areas creates self-reinforcing confirmation loops, starving underreported regions   |
|     of exploratory verification and blinding models to emerging risks.                            |
| (d) Multi-criteria operational routing: balancing risk coverage, travel distance, and workload.   |
+---------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+---------------------------------------------------------------------------------------------------+
| 3. RESEARCH PROBLEM (Open Scientific Questions)                                                   |
| Under strict inspection capacity constraints, how should municipal decision-support systems      |
| balance immediate predictive exploitation (dispatching to highest-risk predicted hotspots) with  |
| randomized exploratory verification to maximize civic risk discovery, eliminate spatial          |
| concentration bias, and optimize field officer dispatch efficiency?                               |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Definitive Research Gap Statement

> **Research Gap:**  
> While prior work has extensively studied spatiotemporal 311 complaint volume forecasting and separate risk-ranked municipal inspection prioritization, existing literature predominantly assumes unconstrained or greedy top-$K$ inspection policies. Consequently, it remains unresolved how to formally integrate calibrated spatiotemporal risk forecasting with an explicit exploration–exploitation verification budget to systematically counter feedback-selection bias and minimize field travel overhead under strict municipal workforce constraints.

---

## 3. Proposed Solution Architecture

The proposed system addresses this gap through a four-stage closed-loop operational pipeline:

1. **Spatiotemporal Escalation Forecasting:** An engineered feature pipeline (36 lag, rolling, seasonal, and cross-service features) coupled with calibrated gradient boosting (XGBoost) predicts next-week complaint escalation probabilities across all 77 Chicago community areas.
2. **Exploration–Exploitation Verification Allocation ($\epsilon$-Greedy Policy):** For a given weekly verification budget $B_t = \lceil K \cdot N \rceil$, the system allocates $(1-\epsilon) \cdot B_t$ (e.g., 90%) to top predicted risk candidates and reserves $\epsilon \cdot B_t$ (e.g., 10%) for uniform exploratory spot-checks across remaining urban zones.
3. **Multi-Objective Spatial Dispatch Optimization:** A normalized composite scoring mechanism dispatches selected candidates to departmental field inspectors, jointly optimizing predicted risk ($40\%$), travel distance minimization ($30\%$), and inspector workload balance ($30\%$).
4. **Relational Traceability & Feedback Ingestion:** A production-grade Express/MongoDB architecture enforces immutable 7-node relational links (Prediction $\rightarrow$ VerificationCandidate $\rightarrow$ Assignment $\rightarrow$ Verification $\rightarrow$ Feedback $\rightarrow$ ModelTrainingRun), capturing field outcomes for retraining triggers.

---

## 4. Testable & Falsifiable Research Hypotheses

### Hypothesis 1 (Predictive Discriminability)
*Formulation:* Supervised gradient-boosted decision trees utilizing multi-order temporal lags, rolling variance, and spatial cross-service features achieve significantly higher probability calibration (lower Brier score) and ranking discrimination (PR-AUC) on out-of-time test partitions than persistence and frequency baselines.  
*Measurement:* Brier Score, PR-AUC, ROC-AUC on 2025 out-of-time test set.

### Hypothesis 2 (Exploration-Driven Escalation Discovery)
*Formulation:* Allocating an explicit exploratory budget fraction ($\epsilon = 10\%$) under fixed capacity constraints ($K \in \{5\%, 10\%, 20\%\}$) discovers significantly more total escalation events and expands geographic community area coverage compared to a pure exploitation policy ($\epsilon = 0\%$), by surfacing latent escalations in low-predicted-risk areas without degrading overall precision.  
*Measurement:* Total discovered escalations, unique community area coverage, low-risk discoveries, cost per discovered escalation, paired weekly $t$-test ($p < 0.05$).

### Hypothesis 3 (Spatial Dispatch Efficiency Preservation)
*Formulation:* Multi-objective inspector assignment incorporating distance and workload penalties achieves a substantial reduction in total and mean officer transit distances ($>10\%$) and balances departmental caseloads while maintaining identical escalation discovery rates as risk-only assignment.  
*Measurement:* Total kilometers traveled, mean inspection transit distance, coefficient of variation of officer workload ($\sigma / \mu$), escalation discovery preservation percentage.
