SMART INVESTMENT DASHBOARD - TEAM ACTION PLAN
SEMESTER EVALUATION SPRINT

OVERVIEW
This document outlines the step-by-step implementation tasks divided across the four team members based on external evaluation feedback. It addresses data horizons, financial metrics, alternative machine learning architectures, quantitative validation, large language model comparison, and competitor benchmarking.


SECTION 1: ALTERNATIVE MACHINE LEARNING MODELS (LITERATURE SURVEY & INTEGRATION)

1. Alternatives to Isolation Forest for Anomaly Detection:
   - Current setup: Isolation Forest in backend/ml_pipeline.py isolates outliers based on price, volume, returns, and volatility.
   - Evaluator critique: Isolation Forest assumes independence or simple partitioning and misses sequential temporal context in time-series stock data.
   - Alternatives from literature:
     a) LSTM Autoencoder (Deep Learning / Temporal):
        - Concept: Trains an encoder-decoder Long Short-Term Memory network on normal market sequences. Reconstruction error is measured. If the reconstruction error on a given day exceeds a defined threshold, it is flagged as an anomaly.
        - Why it fits: Captures sequential dependencies and non-linear patterns over time windows rather than evaluating days in isolation.
     b) One-Class Support Vector Machine (OC-SVM) with RBF Kernel:
        - Concept: Maps non-linear financial features into a high-dimensional space and finds a maximal margin hyperplane separating normal data points from origin outliers.
        - Why it fits: Effective in multi-dimensional feature spaces with low noise when calibrated properly.
     c) Local Outlier Factor (LOF):
        - Concept: Measures the local density deviation of a given data point relative to its k-nearest neighbors.
        - Why it fits: Detects contextual market anomalies where price moves might be normal overall but abnormal relative to immediate historical neighborhood volatility.
   - Action item: Compare Isolation Forest with LSTM Autoencoder or One-Class SVM on anomaly recall and false alarm rate during volatile periods.

2. Alternatives to Random Forest for Portfolio Risk and Crash Prediction:
   - Current setup: Random Forest Classifier in backend/portfolio_model_training.py predicts forward 20-day drops greater than 2% using rolling volatility and correlation.
   - Evaluator critique: Random Forest does not leverage sequential gradient steps and can overfit or struggle with temporal feature boundaries.
   - Alternatives from literature:
     a) Extreme Gradient Boosting (XGBoost) / LightGBM:
        - Concept: Gradient boosted decision trees using second-order gradients and regularization (L1/L2) to prevent overfitting on noisy financial data.
        - Why it fits: Widely recognized across financial literature (e.g., standard quantitative finance benchmarks) as superior to standard Random Forest in tabular predictive accuracy, handling class imbalance, and faster training.
     b) Temporal Convolutional Networks (TCN) or Bi-LSTM:
        - Concept: Deep neural architectures explicitly designed for sequential time-series forecasting.
        - Why it fits: Models market regime shifts and long-term memory across historical trading days directly from raw price and return series.
     c) Logistic Regression / ElasticNet as an Interpretable Baseline:
        - Concept: Regularized linear classification providing direct log-odds interpretations.
        - Why it fits: Serves as a baseline to prove whether complex non-linear models actually add statistically significant predictive value.
   - Action item: Benchmark XGBoost against Random Forest on Precision, Recall, F1-Score, and AUC-ROC for the portfolio crash classification task.


SECTION 2: MODEL VALIDATION METHODOLOGY

1. Time-Series Walk-Forward Cross-Validation:
   - Standard K-Fold splits financial data randomly, which causes look-ahead data leakage (training on future data to predict the past).
   - Solution: Use TimeSeriesSplit (Walk-Forward Validation) from scikit-learn.
   - Setup:
     - Fold 1: Train on Year 1 -> Test on Year 2 Q1
     - Fold 2: Train on Year 1 to Year 2 Q1 -> Test on Year 2 Q2
     - Fold 3: Train on Year 1 to Year 2 Q2 -> Test on Year 2 Q3
     - Fold 4: Train on Year 1 to Year 2 Q3 -> Test on Year 2 Q4
   - This ensures temporal integrity and proves models do not overfit to specific market regimes.

2. Evaluation Metrics:
   - Classification: Precision, Recall, F1-Score (macro and weighted), and ROC-AUC curve. Focus on high Recall for crash predictions (missing a crash is more dangerous than a false alarm).
   - Anomaly Detection: Precision at K, False Positive Rate (FPR), and qualitative sanity checks during known historical market shock dates (e.g., March 2020 COVID shock, 2022 rate hike cycles).
   - Backtesting Simulation: Evaluate cumulative portfolio return and maximum drawdown when taking action based on model signals versus a passive buy-and-hold benchmark.


SECTION 3: VALIDATION AND COMPARISON WITH LLM RESULTS

1. The Problem:
   - The system utilizes two AI layers: a quantitative ML engine (predicting numerical risk, volatility, anomalies) and a generative LLM (OpenRouter API providing qualitative investment advice).
   - Evaluators want to know if the LLM advice aligns with the quantitative ML output or if they contradict each other, and how this alignment is validated.

2. Benchmark Protocol (ML vs. LLM Comparison):
   - Step A: Standardized Test Cases
     Select 20 distinct stock market scenarios across three risk buckets:
     - High Risk / Anomaly Present (e.g., high volatility, predicted crash probability > 70%)
     - Moderate Risk / Volatile
     - Low Risk / Stable (predicted crash probability < 20%, zero anomalies)
   - Step B: Model Output Extraction
     For each case, record the ML Quantitative Risk Score and classification label (Stable vs. High Risk).
   - Step C: LLM Output Categorization
     Feed the same stock metrics into the LLM system prompt and parse the recommendation into a categorical stance:
     - Bullish / Safe to Invest (Score 1)
     - Neutral / Exercise Caution (Score 2)
     - Bearish / High Risk / Avoid (Score 3)
   - Step D: Quantitative Agreement Metrics
     - Directional Alignment Rate: Percentage of cases where ML high-risk flags match LLM cautionary or bearish advice. Target: > 85% alignment.
     - Cohen's Kappa Coefficient: Statistical test measuring inter-rater reliability between the ML classification and LLM recommendation beyond random chance.
     - Contradiction Analysis: Document cases where ML flags high risk but LLM outputs optimistic advice (hallucination / prompt leakage). Use this data to refine prompt constraints in aiService.js.


SECTION 4: MEMBER-WISE WORK BREAKDOWN

MEMBER 1: BACKEND & API ENGINEER (Python / FastAPI)
Focus: Data fetching horizons, Top Sector endpoint, and Screener-style API endpoints.

Task 1: Dynamic History Horizons
- In backend/main.py, replace hardcoded period="6mo" with dynamic query parameters: timeframe (1d, 1wk, 1mo, 1y, max) and interval (5m, 15m, 1d).
- Enables intraday day-trader views as well as multi-year long-term investor views.

Task 2: Top 2 Performers by Sector API
- Create an endpoint /api/top-sectors.
- Fetch tickers from major indices (e.g., Nifty 50), group by sector using ticker.info, calculate 1-year performance, and return the top 2 tickers per sector.

Task 3: Screener Data Support Endpoint
- Provide fundamental ratios (P/E ratio, Market Cap, 52-week High/Low, Return on Capital) alongside price data to support Screener.in style tabular views.


MEMBER 2: QUANT & FINANCIAL LOGIC (Python / Machine Learning)
Focus: XIRR, alternative ML model integration, walk-forward validation, and backtesting.

Task 1: XIRR Implementation
- Write a Python utility using scipy.optimize.newton to calculate XIRR from arbitrary investment cash flows.
- Integrate the calculation into the Sandbox portfolio service.

Task 2: Alternative ML Model Benchmarking (XGBoost & Autoencoder)
- In backend/portfolio_model_training.py, implement XGBoost / LightGBM alongside Random Forest. Compare F1-scores and training latency.
- In backend/ml_pipeline.py, prototype an alternative anomaly detector (One-Class SVM or Autoencoder) and compare with Isolation Forest.

Task 3: Walk-Forward Model Validation Pipeline
- Implement TimeSeriesSplit cross-validation.
- Generate a validation script that exports cross-validation performance metrics (Precision, Recall, ROC-AUC) into a clean summary table for presentation to evaluators.


MEMBER 3: FRONTEND DEVELOPER (React / UI)
Focus: UI for full history charts, Screener.in inspired tables, and XIRR display.

Task 1: Full History Charts & Day Trader View
- In StockSearch.jsx, add timeframe toggle buttons (1D, 1W, 1M, 6M, 1Y, MAX).
- Connect toggle actions to the dynamic backend timeframe parameters.

Task 2: Screener.in Inspired Data Table
- Build a structured data table for sector leaders inspired by Screener.in layout.
- Include clear tabular columns: Company Name, Sector, Current Market Price, P/E, 1-Year Return, and ML Risk Tag.

Task 3: Portfolio XIRR Integration
- In Portfolio.jsx, display Cumulative XIRR alongside total profit/loss and invested amounts.


MEMBER 4: RESEARCH LEAD & EVALUATION (Paper, LLM Testing, ML vs LLM Study)
Focus: Research paper, competitor matrix, LLM model evaluation, and trust analysis.

Task 1: Competitor Differentiation Analysis
- Author a dedicated section in the research paper comparing the dashboard with existing platforms: Zerodha, Groww, and Screener.in.
- Highlight the core differentiator: Screener.in is passive fundamental screening; this dashboard acts as an active AI doctor combining quantitative ML anomaly detection with generative guidance.

Task 2: Multi-LLM Testing on OpenRouter
- Evaluate 3-4 LLMs (e.g., Llama 3, Claude 3 Haiku, GPT-4o-mini, Mistral) on identical financial scenarios.
- Record hallucination rate, prompt adherence, and financial caution.

Task 3: ML vs. LLM Alignment & Validation Study
- Execute the benchmark protocol from Section 3 across 20 test cases.
- Measure directional agreement and Cohen's Kappa between quantitative ML outputs and LLM text advice.
- Document trust boundaries and reasons for mandatory disclaimers.

Task 4: Literature Review on Financial ML Models
- Summarize findings from recent academic literature on XGBoost vs. Random Forest and Isolation Forest vs. Deep Autoencoders in quantitative finance.


SECTION 5: DELIVERABLES CHECKLIST FOR FINAL PRESENTATION

1. Working Codebase:
   - Dynamic timeframe charting (1D to MAX).
   - Screener.in inspired sector leaders table.
   - XIRR metric live in Sandbox portfolio.
   - XGBoost and TimeSeriesSplit validation scripts in backend.

2. Quantitative Proof for Evaluators:
   - Time-series cross-validation results table.
   - Confusion matrix comparing Random Forest vs. XGBoost.
   - Anomaly detection comparison (Isolation Forest vs. One-Class SVM / Autoencoder).

3. LLM & System Validation:
   - ML vs. LLM output alignment comparison matrix (20 test cases).
   - Multi-model LLM benchmark report (latency, accuracy, hallucination risk).
   - Updated research paper including Screener.in competitor analysis and literature review.
