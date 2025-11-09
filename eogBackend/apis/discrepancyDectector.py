from flask import Flask, request, jsonify

# enable CORS so browser-based dev clients can call the API if not using a proxy
from flask_cors import CORS
import pandas as pd
import requests

app = Flask(__name__)
# allow all origins in development; in production tighten this.
CORS(app)

# URL for the tickets API (replace with real endpoint)
TICKETS_API = "https://hackutd2025.eog.systems/api/Tickets"


def check_discrepancy(cauldron_id, date, drain_volume, tolerance=0.05, threshold=5.0):
    """
    Fetches tickets for a given cauldron and date, sums them,
    and compares total ticket volume to actual drained volume.
    """

    # 1️⃣ Fetch tickets from API
    try:
        response = requests.get(TICKETS_API, timeout=10)
        response.raise_for_status()
        data = response.json()

        # Handle different response shapes
        if isinstance(data, dict):
            # If API returns {"tickets": [...]}
            if "tickets" in data:
                all_tickets = data["tickets"]
            elif "data" in data:
                all_tickets = data["data"]
            else:
                # Fallback — look for list-like values in dict
                all_tickets = next(
                    (v for v in data.values() if isinstance(v, list)), []
                )
        elif isinstance(data, list):
            all_tickets = data
        else:
            return {"error": "Unexpected API response format."}

    except Exception as e:
        return {"error": f"Failed to fetch tickets API: {str(e)}"}

    # 2️⃣ Convert to DataFrame safely
    try:
        tickets_df = pd.json_normalize(all_tickets)
    except Exception as e:
        return {"error": f"Error parsing tickets JSON: {str(e)}"}

    if tickets_df.empty:
        return {"error": "No ticket data found in response."}

    # 3️⃣ Validate expected columns exist
    expected_cols = {"cauldron_id", "date", "amount_collected"}
    if not expected_cols.issubset(tickets_df.columns):
        return {
            "error": f"Missing expected columns in ticket data: {list(tickets_df.columns)}"
        }

    # 4️⃣ Filter by cauldron & date
    tickets_df["date"] = pd.to_datetime(tickets_df["date"]).dt.date
    date_obj = pd.to_datetime(date).date()
    cauldron_tickets = tickets_df[
        (tickets_df["cauldron_id"] == cauldron_id) & (tickets_df["date"] == date_obj)
    ]

    if cauldron_tickets.empty:
        return {
            "cauldron_id": cauldron_id,
            "date": str(date_obj),
            "drain_volume": drain_volume,
            "total_ticket_volume": 0.0,
            "status": "MISSING_TICKET",
            "difference": drain_volume,
            "relative_diff": 1.0,
        }

    # 5️⃣ Compute and compare volumes
    total_ticket_volume = cauldron_tickets["amount_collected"].sum()
    diff = abs(total_ticket_volume - drain_volume)
    rel_diff = diff / max(drain_volume, 1e-6)

    if rel_diff <= tolerance or diff <= threshold:
        status = "OK"
    elif total_ticket_volume > drain_volume:
        status = "OVER_REPORTED"
    else:
        status = "UNDER_REPORTED"

    return {
        "cauldron_id": cauldron_id,
        "date": str(date_obj),
        "drain_volume": drain_volume,
        "total_ticket_volume": float(total_ticket_volume),
        "difference": float(diff),
        "relative_diff": float(rel_diff),
        "status": status,
        "num_tickets": int(cauldron_tickets.shape[0]),
    }


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


@app.route("/detect_daily_discrepancy", methods=["POST"])
def detect_daily_discrepancy():
    """
    Expects JSON:
    {
        "tolerance": 0.05,
        "threshold": 5.0,
        "cauldron_data": {
            "cauldron_id": "cauldron_001",
            "date_time": "2025-11-01",
            "drain_volume": 100
        }
    }
    """
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Invalid or missing JSON body"}), 400

    cauldron_data = data.get("cauldron_data", {})
    if not cauldron_data:
        return jsonify({"error": "Missing 'cauldron_data' field"}), 400

    cauldron_id = cauldron_data.get("cauldron_id")
    date = cauldron_data.get("date_time")
    drain_volume = cauldron_data.get("drain_volume")

    if not all([cauldron_id, date, drain_volume is not None]):
        return jsonify({"error": "Missing required cauldron fields"}), 400

    tolerance = float(data.get("tolerance", 0.05))
    threshold = float(data.get("threshold", 5.0))

    # Run detection
    result = check_discrepancy(
        cauldron_id, date, float(drain_volume), tolerance, threshold
    )

    return jsonify(result), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
