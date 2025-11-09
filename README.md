# 🧙 Potion Discrepancy Detection System - EOG Sponsor Challenge

**HackUTD 2025 | Presented by PNC**

A real-time system that detects inconsistencies between potion drain data from cauldrons and potion transport tickets reported by witches — using statistical analysis, Flask APIs, and a React dashboard.

---

## 🚀 Overview

This project identifies discrepancies between **measured potion drains** (from the `/Data` API) and **reported ticket collections** (from the `/Tickets` API).
It uses adaptive anomaly detection to flag suspicious differences — like missing tickets or phantom drains — and provides a live dashboard to visualize them clearly.

---

## 🧩 Features

- **Real-time data processing** from API sources
- **Drain event detection** using statistical thresholding
- **Discrepancy classification** with detailed categories:

  - `MISMATCH`: Volumes match within a set tolerance
  - `MATCH`: Ticket volume > drain volume
  - `DRAIN_NOT_DETECTED`: Ticket volume < drain volume
  - `TICKET_MISSING`: Drain detected but no ticket reported

- **Flask API** to serve comparison results
- **React dashboard** for visual exploration of discrepancies
- **Configurable parameters**: `tolerance`, `std_multiplier`, `min_duration`

---

## 🧠 How We Built It

1. **Data Collection**

   - Fetched potion level data (`/Data`) and ticket logs (`/Tickets`) over a date range.
   - Grouped data by `cauldron_id` and `date` for direct comparison.

2. **Drain Detection**

   - Calculated changes in potion levels across time.
   - Applied a **statistical drain detection algorithm** using standard deviation (`std_multiplier`) to flag sudden drops that indicate potion drains.

3. **Discrepancy Detection**

   - Compared ticket totals to detected drain volumes using a configurable **tolerance** threshold.
   - Classified each cauldron/date entry into one of the four categories listed above.

4. **Visualization**

   - Flask API (`/compare`) returns clean JSON results.
   - React component (`DiscrepancyVisualizer.jsx`) displays:

     - Summary statistics
     - Color-coded discrepancy table
     - Live analysis results

---

## 🧪 Tech Stack

| Layer             | Tools / Frameworks                                         |
| ----------------- | ---------------------------------------------------------- |
| **Frontend**      | React, Fetch API, Inline CSS                               |
| **Backend**       | Flask, Pandas, Requests, JSON                              |
| **Visualization** | Custom summary cards + color-coded table                   |
| **Deployment**    | Local Flask Server (port 5003), Proxy via React dev server |

---

## ⚙️ API Endpoints

### **POST `/compare`**

Analyze discrepancies over a date range.

#### Request

```json
{
  "dates_to_analyze": ["2025-10-30", "2025-11-08"],
  "std_multiplier": 3.0,
  "min_duration": 5,
  "tolerance": 5.0
}
```

#### Response

```json
{
  "summary": {
    "total_comparisons": 120,
    "matches": 58,
    "mismatches": 22,
    "missing_tickets": 30,
    "missing_drains": 10
  },
  "results": [
    {
      "cauldron_id": "cauldron_001",
      "date": "2025-11-01",
      "ticket_amount": 95.8,
      "drain_volume": 0.0,
      "difference": 95.8,
      "category": "DRAIN_NOT_DETECTED",
      "color": "purple"
    }
  ]
}
```

---

## 💻 Running Locally

### 1. Clone the Repository

```bash
git clone https://github.com/Kartik11082/EOG-HackUTD25.git
cd EOG-HackUTD25
```

### 2. Set Up Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Flask will run at **[http://127.0.0.1:5003](http://127.0.0.1:5003)**

### 3. Set Up Frontend

```bash
cd frontend
npm install
npm run dev
```

React will start at **[http://localhost:5173](http://localhost:5173)** and fetch data from Flask.

---

## 🧮 Configuration

| Parameter        | Description                             | Default |
| ---------------- | --------------------------------------- | ------- |
| `std_multiplier` | Sensitivity of drain detection          | `3.0`   |
| `min_duration`   | Minimum minutes for a valid drain       | `5`     |
| `tolerance`      | Acceptable difference in potion volumes | `5.0`   |

---

## 📊 Example Output

| Cauldron ID  | Date       | Ticket Amount | Drain Volume | Difference | Category           |
| ------------ | ---------- | ------------- | ------------ | ---------- | ------------------ |
| cauldron_001 | 2025-11-01 | 95.8          | 0.0          | 95.8       | DRAIN_NOT_DETECTED |
| cauldron_002 | 2025-11-03 | 50.0          | 47.5         | 2.5        | MISMATCH           |
| cauldron_003 | 2025-11-04 | 0.0           | 82.3         | 82.3       | TICKET_MISSING     |

---

## 🪄 Future Enhancements

- Add live alerts for large discrepancies
- Deploy via AWS Lambda or EC2
- Integrate heatmaps and historical trends
- Train an ML model to predict ticket inconsistencies

---

## 👥 Team

**PotionWatch – HackUTD 2025 Team**
Built with 🧠 + ☕ + 💻 during 24 hours of organized chaos.
