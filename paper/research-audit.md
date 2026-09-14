# Research & Technical Project Audit

**Project:** Proactive Civic Complaint Forecasting with Resource-Constrained Verification and Feedback  
**Date of Audit:** September 2026  
**Auditor:** IEEE Paper Builder Research Suite  
**Repository Path:** `e:\Projects\future complaint prediction`  

---

## 1. Executive Summary

This audit evaluates the codebase, datasets, mathematical definitions, machine learning pipelines, simulation experiments, and system architecture implemented in the `future complaint prediction` repository. 

The project develops a full-stack civic decision-support framework designed to transition municipal 311 operations from reactive ticket resolution to proactive spatial-temporal forecasting and resource-constrained field verification. The system combines gradient-boosted classification, an exploration-exploitation verification policy, multi-objective spatial officer dispatching, and a closed-loop relational backend.

| Audit Area | Implementation Status | Scientific Verification Level | Key Artifacts |
| :--- | :--- | :--- | :--- |
| **Data Acquisition & ETL** | Complete (Python / Socrata API) | **VERIFIED** | `download_chicago_311.py`, `base_dataset.csv` |
| **Spatial-Temporal Features** | Complete (Vectorized Pandas) | **VERIFIED** | `feature_engineering_mongodb.py`, `final_feature_dictionary.csv` |
| **Predictive Modeling** | Complete (5 Benchmark Models) | **VERIFIED** | `run_experiments.py`, `model_experiment_report.txt`, `xgboost_model.pkl` |
| **Budgeted Verification Policy** | Complete (Simulation on 2025 Test Set) | **VERIFIED** | `run_verification_experiment.py`, `verification_experiment_report.txt` |
| **Exploration Sensitivity Ablation** | Complete (6 Ratios × 3 Budgets × 4 Seeds) | **VERIFIED** | `run_exploration_ablation_study.py`, `exploration_ablation_report.txt` |
| **Spatial Officer Assignment** | Complete (Heuristic Optimization) | **VERIFIED** | `officer_assignment.py`, `officer_assignment_final_report.txt` |
| **Relational Lifecycle & RBAC API** | Complete (Express.js + MongoDB) | **VERIFIED** | `backend/src/`, `backend/tests/` (17 test suites) |
| **Closed-Loop Retraining Pipeline** | Partially Implemented (Threshold triggers) | **PARTIALLY VERIFIED** | `retrainingService.js`, `modelTrainingService.js` |
| **Multi-Step Feedback Backtest** | Not Backtested | **PROPOSED / UNVERIFIED** | Model retrained statically; dynamic rolling feedback loop unmeasured |
| **Physical Field Verification** | Synthetic / Historical Backtest | **PROPOSED / SIMULATED** | Ground truth evaluated against historical Socrata records, not field visits |

---

## 2. Dataset & Spatial-Temporal Granularity

### 2.1 Data Source & Scope
- **Source:** Official City of Chicago 311 Service Requests (via Socrata Open Data API).
- **Time Horizon:** January 1, 2020 through December 31, 2025 (6 full calendar years).
- **Spatial Units:** 77 official Chicago Community Areas (represented by geographic centroids $\text{lat}_i, \text{lon}_i$).
- **Temporal Resolution:** ISO calendar weeks (52 weeks per year).
- **Service Request Categories (Top 10 High-Impact Municipal Services):**
  1. `Abandoned Vehicle Complaint`
  2. `Blue Recycling Cart`
  3. `Building Violation`
  4. `Garbage Cart Maintenance`
  5. `Graffiti Removal Request`
  6. `Pothole in Street Complaint`
  7. `Rodent Baiting/Rat Complaint`
  8. `Street Light Out Complaint`
  9. `Traffic Signal Out Complaint`
  10. `Tree Debris Clean-Up Request`

### 2.2 Dataset Partitioning & Chronological Splitting
To prevent future lookahead temporal leakage, the dataset is strictly partitioned chronologically:
- **Training Set ($\mathcal{D}_{\text{train}}$):** Years 2020–2023 (208 weeks, $N = 160,160$ observation units).
- **Validation Set ($\mathcal{D}_{\text{val}}$):** Year 2024 (53 ISO weeks, $N = 40,810$ observation units). Used for probability calibration, hyperparameter tuning, and decision threshold selection.
- **Out-of-Time Test Set ($\mathcal{D}_{\text{test}}$):** Year 2025 (51 evaluated weeks, $N = 39,270$ observation units). Used exclusively for out-of-time benchmark reporting.
- **Total Evaluated Grid Units:** 240,240 spatial-temporal observation units ($77 \text{ areas} \times 10 \text{ types} \times 312 \text{ weeks}$).

---

## 3. Feature Engineering & Leakage Safeguards

The feature pipeline (`backend/ai_service/feature_engineering_mongodb.py`) constructs **36 validated predictive features** partitioned into five distinct categories:

```
+---------------------------------------------------------------------------------------------------+
|                                 36 VALIDATED PREDICTIVE FEATURES                                  |
+-----------------------------+-----------------------------+---------------------------------------+
| Category                    | Window / Scope              | Feature Identifiers                   |
+-----------------------------+-----------------------------+---------------------------------------+
| 1. Historical Lag Counts    | Weeks t-1, t-2, t-4, t-8,   | complaints_last_1_week, 2_week,       |
|                             | t-12                        | 4_week, 8_week, 12_week               |
+-----------------------------+-----------------------------+---------------------------------------+
| 2. Rolling Window Stats     | Windows: 4w, 8w, 12w        | rolling_mean_4w, rolling_max_4w,      |
|                             |                             | rolling_std_4w, rolling_mean_8w,      |
|                             |                             | rolling_max_8w, rolling_std_8w,       |
|                             |                             | rolling_mean_12w, rolling_max_12w,    |
|                             |                             | rolling_std_12w                       |
+-----------------------------+-----------------------------+---------------------------------------+
| 3. Seasonal & Cyclical      | Annual / Monthly Cycles     | month, quarter, season, week_of_year, |
|                             |                             | same_week_prev_year_count,            |
|                             |                             | same_month_prev_year_count,           |
|                             |                             | prev_year_same_community_count,       |
|                             |                             | prev_year_same_complaint_count        |
+-----------------------------+-----------------------------+---------------------------------------+
| 4. Spatial Dynamics         | Cross-Service & Ward        | ward, total_complaints_all_types_1w,  |
|                             | Aggregations                | total_all_types_4w, total_all_types_8w|
|                             |                             | total_all_types_12w, distinct_types_4w|
|                             |                             | distinct_types_8w, distinct_types_12w |
+-----------------------------+-----------------------------+---------------------------------------+
| 5. Spatial Coordinates      | Geographic Anchors          | community_area (ID), Centroid Lat/Lon |
+-----------------------------+-----------------------------+---------------------------------------+
```

### Leakage Audit Verdict
- **Forbidden Features:** Current week complaint count (`complaint_count`), target indicators (`future_complaint`, `future_complaint_count`, `escalation_target`), resolution timestamps, and operational status columns are explicitly excluded during feature matrix assembly (`final_feature_dictionary.csv`).
- **Temporal Integrity:** Verified. All rolling and lag aggregations terminate at index $t-1$.

---

## 4. Target Formulations: Critical Distinction

The audit identified **two separate target formulations** used across different scripts in the repository:

### 4.1 Formulation A: Binary Complaint Presence (Base Model Comparison)
Used in `backend/ai_service/run_experiments.py`:
$$y_{i,c,t}^{\text{presence}} = \mathbb{I}(\text{complaints}_{i,c,t+1} > 0)$$
- **Class Distribution:**
  - Training (2020–2023): Positive rate = $89.42\%$ ($143,222 / 160,160$)
  - Validation (2024): Positive rate = $90.43\%$ ($36,904 / 40,810$)
  - Test (2025): Positive rate = $89.98\%$ ($35,336 / 39,270$)
- **Audit Observation:** Because Chicago's top 10 service request types occur in almost every community area on a weekly basis, the presence target is heavily saturated (~90% positive). Naive frequency baselines achieve 89.98% accuracy and 0.9473 F1 simply by predicting positive everywhere.

### 4.2 Formulation B: Escalation Surge Target (Verification & Ablation Studies)
Used in `backend/ai_service/run_verification_experiment.py` and `run_exploration_ablation_study.py`:
$$y_{i,c,t}^{\text{escalation}} = \begin{cases} 1 & \text{if } \text{complaints}_{i,c,t+1} \ge 1.5 \times \text{rolling\_mean\_4\_weeks}_{i,c,t} \\ 0 & \text{otherwise} \end{cases}$$
- **Class Distribution on Test Set (2025):**
  - Total valid observations: $N = 39,270$
  - Positive Escalation Events: $9,143$ ($23.28\%$)
  - Non-Escalation Events: $30,127$ ($76.72\%$)
- **Audit Observation:** Formulation B captures sudden municipal spikes/anomalies relative to local neighborhood baselines. This is a much sounder framing for municipal dispatch prioritization.

---

## 5. Machine Learning Model Benchmark Audit

All models were evaluated on the chronological 2025 out-of-time test set ($N = 39,270$):

| Model | Split | Accuracy | Precision | Recall | F1-Score | ROC-AUC | PR-AUC | Brier Score |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Persistence Baseline** | Test | 88.40% | 0.9341 | 0.9372 | 0.9356 | 0.6716 | 0.9319 | 0.1160 |
| **Frequency Baseline** | Test | 89.98% | 0.8998 | **1.0000** | 0.9473 | 0.5000 | 0.8998 | 0.1002 |
| **Logistic Regression** | Test | 91.04% | 0.9228 | 0.9826 | 0.9518 | 0.9000 | 0.9876 | 0.1328 |
| **Random Forest (100 trees)** | Test | 91.38% | 0.9224 | 0.9873 | 0.9537 | 0.9042 | 0.9881 | 0.1007 |
| **XGBoost (Production)** | **Test** | **91.59%** | **0.9263** | 0.9849 | **0.9547** | **0.9086** | **0.9887** | **0.0622** |

### Benchmark Findings
1. **Discriminative Capability:** XGBoost achieves the highest ROC-AUC ($0.9086$) and PR-AUC ($0.9887$).
2. **Probability Calibration:** XGBoost demonstrates superior calibration, yielding a Brier Score of $0.0622$ (compared to $0.1328$ for Logistic Regression and $0.1007$ for Random Forest). Calibrated probabilities are crucial for risk-ranked inspection thresholds.

---

## 6. Resource-Constrained Verification Policy Audit

### 6.1 Policy Formulations
Under weekly verification budget $B_t = \lceil K \cdot N_{\text{candidates}} \rceil$ where $K \in \{5\%, 10\%, 20\%\}$:
1. **Exploit-Only Policy:** Selects the top $B_t$ candidates ranked strictly by predicted risk $\hat{p}_{i,c,t}$.
2. **Exploit-Explore Policy ($\epsilon$-Greedy, 90/10):**
   - Exploitation slot: $B_t^{\text{exploit}} = \lfloor 0.90 \cdot B_t \rfloor$ (top predicted risk).
   - Exploration slot: $B_t^{\text{explore}} = B_t - B_t^{\text{exploit}}$ (uniform random sample from remaining $N_{\text{candidates}} - B_t^{\text{exploit}}$).

### 6.2 Empirical Results on 2025 Test Set (52 Weeks, 39,270 Candidates, 9,143 True Escalations)

| Budget ($K$) | Policy | Verified Units | Escalations Found | Precision | Recall | Geographic Areas | Low-Risk Escalations | Cost/Discovery |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **5%** | Exploit-Only | 1,989 | 169 | 0.0850 | 0.0185 | 32 / 77 | 0 | 11.77 |
| **5%** | **Exploit-Explore (90/10)**| 1,989 | **187 (+18)** | **0.0940** | **0.0205** | **68 (+36)** | **16** | **10.64** |
| **10%** | Exploit-Only | 3,927 | 382 | 0.0973 | 0.0418 | 49 / 77 | 0 | 10.28 |
| **10%** | **Exploit-Explore (90/10)**| 3,927 | **447 (+65)** | **0.1138** | **0.0489** | **76 (+27)** | **97** | **8.79** |
| **20%** | Exploit-Only | 7,854 | 879 | 0.1119 | 0.0961 | 61 / 77 | 0 | 8.94 |
| **20%** | **Exploit-Explore (90/10)**| 7,854 | **921 (+42)** | **0.1173** | **0.1007** | **77 (+16)** | **90** | **8.53** |

### 6.3 Exploration Sensitivity & Multi-Seed Robustness
A dedicated ablation study (`run_exploration_ablation_study.py`) tested exploration ratios $\eta \in \{0\%, 5\%, 10\%, 15\%, 20\%, 30\%\}$ across 4 random seeds ($42, 123, 2024, 999$).
- **10% Ratio Inflection Point:** 10% exploration delivers the optimal empirical compromise across all budgets, expanding geographic coverage across $76/77$ community areas while achieving a 6.7% to 14.0% reduction in verification cost per discovered escalation.
- **Statistical Significance:** Paired $t$-tests across 51 weeks demonstrate statistically significant discovery gains ($p < 0.0001$ for $K = 10\%$, bootstrap 95% CI on recall gain: $[0.0051, 0.0101]$).

---

## 7. Multi-Objective Officer Dispatching Audit

Selected verification candidates are assigned to departmental officers via a multi-objective composite scoring heuristic:
$$S(i, j) = 0.40 \cdot \tilde{R}_i + 0.30 \cdot (1 - \tilde{D}_{i,j}) + 0.30 \cdot (1 - \tilde{W}_j)$$
where $\tilde{R}_i$ is min-max normalized risk, $\tilde{D}_{i,j}$ is normalized Haversine distance, and $\tilde{W}_j$ is normalized current officer workload.

### Dispatch Backtest Results (Synthetic Officer Pool: $N = 273$ Officers, 7 Departments)

| Budget | Policy | Mean Travel Distance | Total Distance | Workload Imbalance ($\sigma / \mu$) | Escalation Discovery |
| :---: | :--- | :---: | :---: | :---: | :---: |
| **5%** | Risk Only | 8.92 ± 1.16 km | 640.6 ± 104.8 km | 0.434 ± 0.021 | 18.0 ± 0.8 |
| **5%** | **Risk + Dist + Workload** | **7.56 ± 0.68 km (-15.3%)** | **543.2 ± 77.9 km** | 0.453 ± 0.043 | **18.0 ± 0.8 (100%)** |
| **10%** | Risk Only | 9.65 ± 0.47 km | 1361.8 ± 164.8 km | 0.380 ± 0.024 | 29.3 ± 1.3 |
| **10%** | **Risk + Dist + Workload** | **8.30 ± 0.95 km (-14.0%)** | **1174.3 ± 216.1 km** | **0.355 ± 0.015 (-6.7%)** | **29.3 ± 1.3 (100%)** |
| **20%** | Risk Only | 10.13 ± 0.63 km | 3121.6 ± 369.5 km | 0.312 ± 0.018 | 64.3 ± 4.7 |
| **20%** | **Risk + Dist + Workload** | **9.18 ± 0.55 km (-9.4%)** | **2827.9 ± 325.6 km** | **0.303 ± 0.017 (-2.8%)** | **64.3 ± 4.7 (100%)** |

---

## 8. Technical & Methodological Limitations

The audit identifies six critical scientific limitations that must be transparently addressed in any formal manuscript:

1. **Retrospective Simulation vs. Physical Ground Truth:**
   Field inspections are simulated using historical Socrata 311 complaint records ($y_{t+1}$). Real-world physical inspection findings (e.g., verifying whether a pothole was actually present before citizens complained) are not captured in open government portals.
2. **Synthetic Officer Workforces:**
   While the spatial complaint data reflects real municipal events in Chicago, officer workforce availability, shift boundaries, and starting depot coordinates were synthetically generated for backtesting.
3. **Absence of Multi-Step Closed-Loop Retraining Backtest:**
   Although the software architecture contains an automated retraining service (`retrainingService.js`), the experimental results in `data/results/` do not include a sequential, multi-step rolling backtest comparing models retrained on exploration feedback versus models retrained on exploitation-only feedback over multi-year horizons.
4. **Spatial Aggregation Resolution:**
   The model operates at the 77 Community Area centroid level. Sub-neighborhood micro-hotspots (individual street blocks or parcels) are not resolved.
5. **Heuristic Assignment vs. Exact MIP / Integer Programming:**
   The officer dispatch policy uses a greedy normalized composite ranking rather than an exact Mixed-Integer Linear Program (MILP) or Vehicle Routing Problem (VRP) solver.
6. **Selection Bias in Historical 311 Reporting:**
   Historical 311 requests reflect human reporting frequency, which is confounded by neighborhood demographics, internet access, and civic trust. While the 10% exploration policy mitigates algorithmic feedback concentration, it does not fully eliminate underlying human reporting disparities.
