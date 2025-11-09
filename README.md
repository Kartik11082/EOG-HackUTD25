# EOG Discrepancy Detection System

## 🏗️ System Architecture

The system uses a two-phase approach for efficient discrepancy detection:

### Phase 1: One-time Drain Analysis

- Analyzes time-series data to detect drain events
- Calculates fill rates for each cauldron
- Computes expected volumes considering fill-during-drain
- Only runs once at startup

### Phase 2: Dynamic Ticket Processing

- Matches tickets to known drain events
- Identifies discrepancies (over/under reporting)
- Detects phantom tickets and missing documentation
- Runs quickly whenever tickets change

## 🚀 Setup Instructions

### Backend Setup

```bash
cd eogBackend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# OR
.venv\Scripts\Activate.ps1  # Windows PowerShell

# Install dependencies
pip install -r requirements.txt

# Start the Flask server
python apis/discrepancyDetector.py
```

### Frontend Setup

```bash
cd eogFrontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## 📊 API Endpoints

### GET /health

Health check endpoint.

### POST /detect_daily_discrepancy

Legacy endpoint for single-cauldron analysis.

Request body:

```json
{
  "cauldron_data": {
    "cauldron_id": "cauldron_001",
    "date_time": "2025-11-01",
    "drain_volume": 100
  },
  "tolerance": 0.05
}
```

### POST /analyze_discrepancies

New endpoint for bulk analysis across all cauldrons.

Request body:

```json
{
  "tolerance": 0.05
}
```

Response format:

```json
{
  "summary": {
    "total_tickets": 149,
    "total_drains": 142,
    "total_discrepancies": 23,
    "suspicious_tickets": 12,
    "missing_tickets": 5,
    "ok_matches": 119
  },
  "discrepancies": [
    {
      "type": "over_reported",
      "severity": "critical",
      "cauldron_id": "cauldron_008",
      "date": "2025-10-31",
      "ticket_id": "TT_20251031_019",
      "ticket_volume": 95.35,
      "expected_volume": 72.76,
      "difference": 22.59,
      "message": "Over-reported by 22.59 units"
    }
  ],
  "by_cauldron": {
    "cauldron_008": [
      /* discrepancies */
    ]
  },
  "by_date": {
    "2025-10-31": [
      /* discrepancies */
    ]
  }
}
```

## 🔧 Configuration

### Backend

- `TICKETS_API`: URL for the tickets API
- `DATA_API`: URL for time-series data API
- `CAULDRONS_API`: URL for cauldron metadata API

### Frontend

- Uses Vite proxy to forward `/api/*` requests to the backend
- Configure proxy target in `vite.config.js`

## 🎯 Key Features

1. **Smart Volume Calculation**

   - Accounts for potion generation during drain
   - Expected volume = visible_drop + (fill_rate × duration)

2. **Robust Matching**

   - Matches tickets to drains using scoring algorithm
   - Considers volume similarity, dates, and capacity limits

3. **Comprehensive Classification**

   - Over/under reporting detection
   - Phantom ticket identification
   - Missing documentation alerts
   - Severity assessment (critical, high, medium, low)

4. **Real-time Updates**
   - Pre-computes stable drain data
   - Fast re-matching when tickets change
   - Optimized for judging environment
