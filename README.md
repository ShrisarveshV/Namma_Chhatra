# 🎓 Namma Chhatra: AI-Powered Early Warning System

![Namma Chhatra Dashboard Preview](https://via.placeholder.com/1000x500.png?text=Namma+Chhatra+Dashboard) 
*(Note: Replace with an actual screenshot of your dashboard)*

## 📖 About The Project

**Namma Chhatra** ("Learning Never Exhausts The Mind") is a modern, data-driven school management platform built to bridge the gap between educational administration and proactive student intervention. 

The core of this project is an **AI-driven Early Warning System**. By analyzing factors like attendance drops, academic decline, commute distances, and socio-economic indicators, the integrated Machine Learning engine automatically flags at-risk students. It provides educators with a "Risk Score" and human-readable "Risk Drivers," allowing them to intervene—via a dedicated Counseling Roster—before a student drops out.

### 🌟 Key Features

*   **Dual-Role Dashboards:** Tailored interfaces for **Headmasters** (macro-level school analytics) and **Teachers** (micro-level classroom management).
*   **Real-Time AI Predictions:** Evaluates student dropout risk (Safe, Low, Medium, High) on the fly using a pre-trained XGBoost Machine Learning model.
*   **AI Reasoning Engine:** Doesn't just provide a score—it outputs actionable, multi-factor reasons explaining *why* a student was flagged (e.g., "Critical attendance drop," "Long commute burden").
*   **Automated Batch Processing:** Nightly Cron jobs automatically re-evaluate the entire student body based on the day's attendance and academic inputs.
*   **Student 360° Profile:** An interactive modal providing deep insights into a student's history, weekly attendance trends, and parent contact details.
*   **Counseling Workflow:** A dedicated roster allowing educators to flag high-risk students, assign counseling, and track intervention progress.

---

## 🛠️ Tech Stack

**Frontend:**
*   React.js 
*   Tailwind CSS (or your chosen CSS framework)
*   Recharts (for Data Visualization & Attendance Trends)

**Backend:**
*   Node.js / Express or Python (FastAPI/Flask)
*   SQL Database (PostgreSQL / MySQL)
*   Cron / APScheduler (Background task automation)

**Machine Learning:**
*   XGBoost (Gradient Boosted Decision Trees)
*   Scikit-learn & Pandas (Data processing)
*   Joblib (Model serialization `.pkl`)

---

## 🧠 How the AI Engine Works

1.  **Data Ingestion:** The system captures daily metrics like attendance percentages, grade fluctuations, and demographic data.
2.  **Inference:** The backend loads a serialized `xgboost` model (`dropout_prediction_model.pkl`) into memory.
3.  **Evaluation:** New or updated students are passed through the model via a prediction API. 
4.  **Actionable Output:** The AI calculates a probability score and applies heuristic thresholds to generate human-readable "Key Risk Drivers."

---

## 🚀 Getting Started

### Prerequisites
*   Node.js & npm installed
*   Python 3.8+ installed (for the ML environment)
*   Local or cloud SQL database running

### Installation

1. **Clone the repo**
   ```sh
   git clone [https://github.com/your-username/namma-chhatra.git](https://github.com/your-username/namma-chhatra.git)
