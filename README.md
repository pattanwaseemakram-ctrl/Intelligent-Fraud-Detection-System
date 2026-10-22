# Financial Fraud Detection System

An enterprise-grade, end-to-end Machine Learning and Security Operations platform designed to detect fraudulent financial transactions in real time with high precision, high recall, and near-zero false alarms.

---

## Performance Benchmark

Evaluated on an untouched hold-out test set of **2,000 transactions** (1,800 legitimate, 200 fraudulent):

| Metric | Baseline ($T = 0.50$) | Calibrated ($T = 0.42$) | Performance Impact |
| :--- | :---: | :---: | :--- |
| **Recall (Fraud Caught)** | 97.00% (194/200) | **98.50% (197/200)** | 🟢 **Catches 3 additional frauds** |
| **Missed Frauds (FN)** | 6 missed | **3 missed** | 🟢 **Missed fraud rate cut by 50%** |
| **Precision** | **87.39%** | 84.55% | Only 36 false alarms out of 1,800 normal |
| **Accuracy** | **98.30%** | 98.05% | Near-zero false alarm rate (2.0%) |
| **$F_1$-Score** | 91.94% | 90.99% | Robust harmonic balance |
| **$F_2$-Score (Fraud-Weighted)** | 94.91% | **95.35%** | 🟢 **Optimal recall-weighted fraud metric** |
| **ROC-AUC** | **0.9967** | **0.9967** | Outstanding discriminative ability |
| **PR-AUC** | **0.9712** | **0.9712** | Superior performance on imbalanced class |

### Confusion Matrix (Operating Threshold $T = 0.42$)

```text
                     Predicted Normal (0)   Predicted Suspicious (1)
Actual Normal (0)            1,764                      36          (False Alarms)
Actual Suspicious (1)            3                     197          (Frauds Caught)
                             (Missed)
```

### Financial Impact of Threshold Calibration ($T = 0.42$)

At the default threshold of `0.50`, 6 frauds escaped. Calibrating the operating point to **`0.42`** rescued **3 high-value fraud transactions** with minimal analyst review overhead (+8 false alarms in 1,800 normal cases):

| Transaction ID | Type | Location | Fraud Probability | Amount | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`T5438`** | Transfer | New York | **0.4631** | ₹3,379.23 | **Caught at 0.42** |
| **`T6552`** | Withdrawal | New York | **0.4277** | ₹5,574.16 | **Caught at 0.42** |
| **`T6165`** | Withdrawal | Florida | **0.4204** | ₹3,081.05 | **Caught at 0.42** |

> **Total Intercepted Fraud Value:** **₹1,224,880.04** (~₹12.25 Lakhs) across all 197 caught frauds, recovering an extra **₹12,034.44** specifically through threshold calibration.

---

## System Architecture

```text
Financial-Fraud-Detection-System/
│
├── Dataset/
│   ├── raw dataset/
│   │   └── financial_transactions.csv            # Raw transaction records (10,000 rows)
│   ├── processed data/
│   │   ├── cleaned_transactions.csv              # Preprocessed & validated transactions
│   │   ├── feature_engineered_transactions.csv   # Domain-engineered risk features
│   │   ├── encoded_transactions.csv              # One-hot encoded dataset
│   │   └── encoded_transactions_improved.csv     # Extended feature dataset
│   └── split/
│       ├── X_train.csv / X_test.csv              # Scaled features (80% train / 20% test)
│       ├── y_train.csv / y_test.csv              # Ground-truth targets
│       ├── X_train_selected.csv                  # Selected top 11 features (train)
│       ├── X_test_selected.csv                   # Selected top 11 features (test)
│       └── feature_importance.png                # Random Forest feature importance chart
│
├── pipeline/
│   ├── data_preprocessing.py                     # Data hygiene, missing value & type checks
│   ├── feature_engineering.py                    # Behavioral ratios, time & interaction features
│   ├── encoding.py                               # Categorical one-hot encoding
│   ├── feature_scaling.py                        # StandardScaler & stratified 80/20 train/test split
│   ├── feature_selection.py                      # Random Forest feature importance ranking
│   ├── eda.PY                                    # Exploratory data analysis
│   ├── correlation_matrix.py                     # Feature correlation computation
│   ├── outlier_detection.py                      # Outlier detection analysis
│   └── class_imbalance_check.py                  # Imbalance analysis & resampling helpers
│
├── final_model/
│   ├── custom_transformers.py                    # FeatureSelector & SelectiveScaler transformers
│   ├── train_model.py                            # End-to-end model training (ROS + Logistic Regression)
│   ├── threshold_optimization.py                 # Multi-criterion threshold tuning & financial cost optimization
│   ├── final_prediction.py                       # Batch prediction engine with risk tiers & probabilities
│   ├── models/
│   │   └── ros_logistic_end_to_end_finetuned.pkl # Production trained pipeline model
│   ├── evaluation/
│   │   ├── final_evaluation.py                   # Evaluation suite on untouched test data
│   │   └── results/
│   │       ├── final_evaluation_report.txt       # Text report of metrics & confusion matrix
│   │       ├── confusion_matrix.png              # High-resolution confusion matrix heatmap
│   │       ├── threshold_optimization_report.txt # Multi-strategy threshold report & cost benchmark
│   │       ├── threshold_sweep_results.csv       # Sweep data across candidate cutoffs (0.05 to 0.95)
│   │       ├── threshold_metrics_curve.png       # Precision, Recall, F1, F2 vs threshold plot
│   │       └── threshold_cost_curve.png          # Total financial loss vs threshold curve
│   ├── visualization/
│   │   ├── final_curves.py                       # Script to generate ROC and PR curves
│   │   └── results/
│   │       ├── roc_curve.png                     # ROC curve (AUC = 0.9967)
│   │       └── precision_recall_curve.png        # Precision-Recall curve (PR-AUC = 0.9712)
│   └── results/
│       ├── final_fraud_predictions.csv           # Scored transactions with fraud probabilities
│       ├── predicted_197_frauds.csv              # Complete dataset of all 197 caught fraud cases
│       ├── predicted_233_suspicious_total.csv    # All 233 flagged cases (197 true + 36 false alarms)
│       └── request_body_197_transactions.json    # JSON batch payload for API testing
│
├── backend/
│   ├── app.py                                    # Slim FastAPI entry point & router mounting
│   ├── config.py                                 # Environment, paths, logging, CORS & lifespan
│   ├── auth.py                                   # OAuth2 scheme, Bearer token verification & login
│   ├── schemas.py                                # Pydantic request & response validation models
│   ├── model_service.py                          # Feature preparation & calibrated model scoring
│   ├── alert_service.py                          # PostgreSQL & SQLite alert management service
│   ├── predict_197_batch_api.py                  # Automated batch inference test script for 197 frauds
│   └── routes/
│       ├── __init__.py                           # Router package initialization
│       ├── prediction_routes.py                  # /predict, /batch-predict, /sample-197-batch
│       ├── alert_routes.py                       # /alerts, /alerts/{id}, /status, /alerts-summary
│       └── system_routes.py                      # /, /api, /health, /model/monitoring-stats
│
├── frontend/
│   ├── landing.html                              # High-impact platform landing page
│   ├── login.html                                # Secure portal login with password toggle
│   ├── dashboard.html                            # Enterprise SOC Fraud Monitoring Dashboard
│   ├── css/
│   │   ├── common.css                            # Shared design tokens, typography & base reset
│   │   ├── landing.css                           # Landing page styling & animations
│   │   ├── login.css                             # Authentication card & state styling
│   │   └── dashboard.css                         # Dark fintech UI, 4-column layout & chart styles
│   └── js/
│       ├── api.js                                # REST API client layer & token management
│       ├── landing.js                            # Landing page interactions
│       ├── login.js                              # Login validation & session handling
│       └── dashboard.js                          # Real-time predictor, charts & alert triage
│
├── Documentation/                                # Academic & Technical Documentation Suite
│   ├── Project_Report.pdf                        # Master comprehensive explanation of project
│   ├── Data_Preprocessing.pdf                    # Pipeline hygiene, feature math & balancing
│   ├── Machine_Learning.pdf                      # Model training, threshold calibration (T=0.42)
│   ├── System_Architecture.pdf                   # FastAPI, PostgreSQL & multi-theme UI architecture
│   ├── API_Documentation.pdf                     # OpenAPI specifications, endpoints & schemas
│   ├── Testing_Report.pdf                        # QA verification & 197-batch holdout testing
│   └── Screenshots/                              # Platform UI screenshots & high-resolution plots
│
├── requirements.txt                              # Pinned Python package dependencies
├── .gitignore                                    # Version control exclusion rules
└── README.md                                     # Project documentation
```

---

## Machine Learning Pipeline

```text
Raw Data (10,000 Transactions)
       |
       v
1. Preprocessing (pipeline/data_preprocessing.py)
   - Null value validation & duplicate elimination
   - Timestamp parsing & type conversion
       |
       v
2. Feature Engineering (pipeline/feature_engineering.py)
   - Spending_Deviation_Amount = Amount * Spending_Pattern_Deviation
   - Location_Deviation = 1 - Login_Location_Match
   - Amount_to_Balance_Ratio & Amount_Percent_of_Balance
   - Unusual_Hour flag (midnight to 5 AM / late evening)
       |
       v
3. Categorical Encoding (pipeline/encoding.py)
   - One-hot encoding for Type, Location, and Transaction_Weekday
       |
       v
4. Stratified Split & Scaling (pipeline/feature_scaling.py)
   - 80% Train (8,000) / 20% Test (2,000) stratified hold-out
   - StandardScaler fitted strictly on training data (Zero data leakage)
       |
       v
5. Feature Selection (pipeline/feature_selection.py)
   - Random Forest importance ranking selects the top 11 most predictive features
       |
       v
6. End-to-End Modeling (final_model/train_model.py)
   - Random Over-Sampling (ROS) balances the 10% minority fraud class
   - Logistic Regression with 5-fold Stratified Cross-Validation
   - Exported as a complete deployable pipeline
       |
       v
7. Evaluation & Predictions (final_model/)
   - final_evaluation.py -> Generates metrics & confusion matrix
   - final_curves.py     -> Generates ROC & Precision-Recall curves
   - final_prediction.py -> Assigns probabilities and risk categories (Low, Medium, High)
```

---

## Top 11 Engineered Features

The Random Forest feature selection identified the top 11 predictive features:

1. **`Known Threat Flag`** (`+14.3364` weight): Historical blacklist or malicious entity flag.
2. **`User Device Recognition`** (`-12.2717` weight): Strongest trust factor; unrecognized device indicates potential takeover.
3. **`Spending Pattern Deviation`** (`+11.3099` weight): Sudden behavioral anomaly compared to user history.
4. **`Login Location Match`** (`-7.4762` weight): Whether login IP city matches account registration.
5. **`Location_Deviation`** (`+5.0270` weight): Inverted location trust indicator.
6. **`Amount`** (`+3.1715` weight): High transaction volume.
7. **`Account Balance`** (`-1.6061` weight): Depleted balance ratio.
8. **`Spending_Deviation_Amount`**: Product of transaction amount and deviation.
9. **`Amount_Percent_of_Balance`**: Ratio of amount to available funds.
10. **`Amount_to_Balance_Ratio`**: Direct drain percentage.
11. **`Transaction_Hour`**: Initiated during anomalous hours (e.g. 2:00 AM – 5:00 AM).

---

## REST API Architecture & Endpoints

The backend is built with **FastAPI** using a modular `APIRouter` design pattern.

### API Endpoints Summary

| Tag | Method | Endpoint | Description | Auth Required |
| :--- | :---: | :--- | :--- | :---: |
| **Authentication & Security** | `POST` | `/auth/token` | Authenticate and obtain Bearer access token | No |
| | `POST` | `/token` | Backward-compatible token endpoint alias | No |
| **Fraud Prediction Engine** | `POST` | `/predict` | Real-time single transaction scoring | 🔒 Yes |
| | `POST` | `/batch-predict` | Batch transaction scoring with auto-alert sync | 🔒 Yes |
| | `GET` | `/sample-197-batch` | Load pre-formatted 197 test-set transactions | No |
| **Fraud Alert Management** | `GET` | `/alerts` | Retrieve alerts with optional status filter | 🔒 Yes |
| | `GET` | `/alerts/{alert_id}` | Retrieve details of a specific alert | 🔒 Yes |
| | `PUT` | `/alerts/{alert_id}/status` | Update alert status (`New`, `Under Review`, `Resolved`) | 🔒 Yes |
| | `DELETE` | `/alerts/{alert_id}` | Remove an alert from database | 🔒 Yes |
| | `GET` | `/alerts-summary` | KPI counts of total, new, review, resolved alerts | 🔒 Yes |
| **System Health & Monitoring** | `GET` | `/` | Service root and endpoint discovery | No |
| | `GET` | `/health` | Health status of API, model, and PostgreSQL database | No |
| | `GET` | `/model/monitoring-stats` | Live model operating stats and threshold configuration | 🔒 Yes |

---

## Frontend Web Application

The frontend is built using standard Vanilla Web Technologies (HTML5, Vanilla CSS, Modern JavaScript) with a luxury dark fintech theme.

### Key Pages & Capabilities

1. **Landing Portal (`landing.html`)**:
   - Platform introduction, capability highlights, and direct login navigation.
2. **Secure Login (`login.html`)**:
   - Form-based OAuth2 authentication with password reveal/hide toggle and validation error states.
3. **SOC Fraud Monitoring Dashboard (`dashboard.html`)**:
   - **Overview**: Real-time KPI summary cards (Total Alerts, New Cases, Under Review, Resolved) and activity timeline.
   - **Real-Time Fraud Prediction**:
     - Ergonomic **4-Column Vertical Layout**:
       - `01. Transaction Identity`: Transaction ID, Timestamp, Sender Account, Receiver Account.
       - `02. Transaction Attributes`: Amount (₹), Type, Account Balance (₹), Spending Deviation.
       - `03. Device & Location`: Device ID, IP Address, Transaction Location.
       - `04. Risk Indicators`: Recognized Device, Known Threat Flag, Login Location Match.
     - **Quick-Clear ('✕') Buttons**: Built-in cross buttons on all text/number/datetime fields to clear already entered inputs with a single click.
     - **Immediate Result Panel**: Probability gauge, verdict banner (`Suspicious` vs. `Normal`), risk score, and auto-generated database alert note.
   - **Interactive Analytics & ML Evaluation**:
     - Dynamic **ROC Curve** ($AUC = 0.9967$).
     - Dynamic **Precision-Recall (PR) Curve** ($PR-AUC = 0.9712$).
     - **Live Decision Threshold Tuning Slider**: Adjust threshold dynamically ($0.00 - 1.00$) with preset buttons (`0.42 Calibrated`, `0.50 Standard`, `0.30 High Recall`).
     - Live **Confusion Matrix Heatmap**: Real-time recalculation of True Positives, False Positives, True Negatives, and False Negatives as the slider moves.
   - **Alert Management & Triage**:
     - Interactive table of PostgreSQL alerts with real-time status filtering (`New`, `Under Review`, `Resolved`), search, inline status update buttons, and deletion.

---

## Project Documentation Suite

Comprehensive formal academic and technical documentation is maintained in the [`Documentation/`](./Documentation/) directory:

| Priority | Document | Format | Description |
| :---: | :--- | :---: | :--- |
| **1** | [`Project_Report.pdf`](./Documentation/Project_Report.pdf) | PDF (8 Pages) | Master comprehensive explanation of problem, architecture, ML results, and roadmap |
| **2** | [`Data_Preprocessing.pdf`](./Documentation/Data_Preprocessing.pdf) | PDF (2 Pages) | Data hygiene, 5 behavioral engineered features, one-hot encoding, and ROS balancing |
| **3** | [`Machine_Learning.pdf`](./Documentation/Machine_Learning.pdf) | PDF (3 Pages) | Model training, 5-fold CV, T=0.42 threshold tuning, and financial cost minimization |
| **4** | [`System_Architecture.pdf`](./Documentation/System_Architecture.pdf) | PDF (3 Pages) | Multi-tier topology, FastAPI micro-routers, PostgreSQL schema, and 5-theme switcher |
| **5** | [`API_Documentation.pdf`](./Documentation/API_Documentation.pdf) | PDF (2 Pages) | Complete OpenAPI endpoint catalog, request/response schemas, and OAuth2 security |
| **6** | [`Testing_Report.pdf`](./Documentation/Testing_Report.pdf) | PDF (3 Pages) | QA validation, 197 hold-out fraud batch verification, latency tests, and security tests |
| **7** | [`Screenshots/`](./Documentation/Screenshots/) | Directory (14 Assets) | High-resolution UI screenshots (Landing, Login, Dashboard) and analytical charts |

---

## How to Run

### 1. Environment Setup

Clone the repository and install dependencies:

```bash
python -m venv venv

# On Windows:
.\venv\Scripts\activate

# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Configure Environment (`.env`)

Create or verify your `.env` file in the project root:

```env
# Database Configuration (PostgreSQL with SQLite fallback)
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fraud_detection

# Application Security
FRAUD_ADMIN_PASSWORD=admin123
FRAUD_ANALYST_PASSWORD=analyst123
FRAUD_API_TOKEN=fraud-secret-bearer-token-2026

# CORS
CORS_ORIGINS=http://127.0.0.1:5500,http://localhost:5500,http://127.0.0.1:8000,http://localhost:8000
```

### 3. Start the FastAPI Backend

Launch the REST API server:

```bash
uvicorn backend.app:app --reload --port 8000
```

- **Swagger Documentation**: `http://127.0.0.1:8000/docs`
- **ReDoc Documentation**: `http://127.0.0.1:8000/redoc`
- **Health Check**: `http://127.0.0.1:8000/health`

### 4. Open the Web Application

Open the frontend using VS Code Live Server or your preferred HTTP server:

```text
http://127.0.0.1:5500/frontend/landing.html
```

- **Log in credentials**:
  - Username: `admin` | Password: `admin123` (Chief Risk Officer)
  - Username: `analyst` | Password: `analyst123` (Fraud Analyst)

### 5. Run Automated Batch Verification (197 Frauds)

To verify that all 197 hold-out fraud cases are caught and synced to PostgreSQL:

```bash
python backend/predict_197_batch_api.py
```

---

## Technologies Used

- **Language:** Python 3.10+
- **Machine Learning & Pipeline:** `scikit-learn`, `imbalanced-learn`, `xgboost`, `pandas`, `numpy`
- **Database & ORM:** `PostgreSQL`, `SQLAlchemy 2.0`, `psycopg2-binary` (with automatic SQLite fallback)
- **API & Serving:** `FastAPI`, `Uvicorn`, `Pydantic v2`
- **Security:** OAuth2 Password Bearer flow (`bearerAuth`) with Role-Based Access Control (RBAC)
- **Frontend & UI:** HTML5, Vanilla CSS (Glassmorphic dark fintech theme), Modern JavaScript (Fetch API, Canvas/SVG Charts)
- **Visualization:** `matplotlib`, `seaborn`
- **Serialization:** `joblib`
