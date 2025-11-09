from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import requests
import json
from datetime import datetime, timedelta
from drainDetectorJson import analyze_drains

app = Flask(__name__)
CORS(app)

TICKETS_API_URL = "https://hackutd2025.eog.systems/api/Tickets"


# ------------------------------
# Helper functions
# ------------------------------


def fetch_tickets():
    try:
        response = requests.get(TICKETS_API_URL, timeout=30)
        response.raise_for_status()
        data = response.json()

        if isinstance(data, dict) and "transport_tickets" in data:
            tickets = data["transport_tickets"]
        elif isinstance(data, list):
            tickets = data
        else:
            tickets = [data]

        return tickets
    except Exception as e:
        print(f"Error fetching tickets: {e}")
        return []


def group_tickets_by_cauldron_date(tickets):
    grouped = {}
    for ticket in tickets:
        cauldron_id = ticket["cauldron_id"]
        date = ticket["date"].split("T")[0] if "T" in ticket["date"] else ticket["date"]
        amount = float(ticket["amount_collected"])
        key = (cauldron_id, date)
        grouped[key] = grouped.get(key, 0) + amount
    return grouped


def group_drains_by_cauldron_date(drain_data):
    grouped = {}
    for entry in drain_data:
        key = (entry["cauldron_id"], entry["date_time"])
        grouped[key] = float(entry["drain_volume"])
    return grouped


def compare_tickets_and_drains(tickets_grouped, drains_grouped, tolerance=5.0):
    results = []
    all_keys = set(tickets_grouped.keys()) | set(drains_grouped.keys())

    for key in sorted(all_keys):
        cauldron_id, date = key
        ticket_amount = tickets_grouped.get(key, 0.0)
        drain_volume = drains_grouped.get(key, 0.0)
        diff = abs(ticket_amount - drain_volume)

        if ticket_amount > 0 and drain_volume > 0:
            if diff <= tolerance:
                status, color = "MATCH", "green"
            else:
                status, color = "MISMATCH", "red"
        elif ticket_amount > 0:
            status, color = "DRAIN_NOT_DETECTED", "orange"
        elif drain_volume > 0:
            status, color = "TICKET_MISSING", "red"
        else:
            status, color = "NO_DATA", "gray"

        results.append(
            {
                "cauldron_id": cauldron_id,
                "date": date,
                "ticket_amount": round(ticket_amount, 2),
                "drain_volume": round(drain_volume, 2),
                "difference": round(diff, 2),
                "status": status,
                "color": color,
            }
        )
    return results


# ------------------------------
# Date range generator
# ------------------------------


def generate_date_range(start_date, end_date):
    start = datetime.strptime(start_date, "%Y-%m-%d").date()
    end = datetime.strptime(end_date, "%Y-%m-%d").date()
    print(f"Generating date range from {start} to {end}")
    print(f"Total days: {(end - start).days + 1}")
    print(
        f"Dates: {[ (start + timedelta(days=i)).strftime('%Y-%m-%d') for i in range((end - start).days + 1)]}"
    )
    return [
        (start + timedelta(days=i)).strftime("%Y-%m-%d")
        for i in range((end - start).days + 1)
    ]


# ------------------------------
# Core API route
# ------------------------------


@app.route("/compare", methods=["POST"])
def compare_api():
    """
    POST JSON Body:
    {
        "dates_to_analyze": ["2025-10-30", "2025-10-31"],  # can be one or two dates
        "std_multiplier": 3.0,
        "min_duration": 5,
        "tolerance": 5.0
    }
    """
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Invalid or missing JSON body"}), 400

    dates = payload.get("dates_to_analyze", [])
    std_multiplier = payload.get("std_multiplier", 3.0)
    min_duration = payload.get("min_duration", 5)
    tolerance = payload.get("tolerance", 5.0)

    # Handle date range logic
    if not dates:
        return jsonify({"error": "Please provide at least one date"}), 400

    if len(dates) == 1:
        start_date = dates[0]
        end_date = datetime.utcnow().strftime("%Y-%m-%d")
        dates_to_analyze = generate_date_range(start_date, end_date)
    else:
        start_date, end_date = sorted(dates)[0], sorted(dates)[-1]
        dates_to_analyze = generate_date_range(start_date, end_date)

    # print(
    #     f"Analyzing date range: {dates_to_analyze[0]} → {dates_to_analyze[-1]} ({len(dates_to_analyze)} days)"
    # )

    try:
        tickets = fetch_tickets()
        if not tickets:
            return jsonify({"error": "No ticket data available"}), 404

        drain_json = analyze_drains(dates_to_analyze, std_multiplier, min_duration)
        drain_data_dict = json.loads(drain_json)
        drain_data = drain_data_dict.get("cauldron_data", [])

        tickets_grouped = group_tickets_by_cauldron_date(tickets)
        drains_grouped = group_drains_by_cauldron_date(drain_data)
        comparison_results = compare_tickets_and_drains(
            tickets_grouped, drains_grouped, tolerance
        )

        total = len(comparison_results)
        matches = sum(r["status"] == "MATCH" for r in comparison_results)
        mismatches = sum(r["status"] == "MISMATCH" for r in comparison_results)
        missing_tickets = sum(
            r["status"] == "TICKET_MISSING" for r in comparison_results
        )
        missing_drains = sum(
            r["status"] == "DRAIN_NOT_DETECTED" for r in comparison_results
        )

        summary = {
            "total_comparisons": total,
            "matches": matches,
            "mismatches": mismatches,
            "missing_tickets": missing_tickets,
            "missing_drains": missing_drains,
            "match_percentage": round((matches / total * 100) if total else 0, 2),
            "tolerance_used": tolerance,
        }

        report = {
            "summary": summary,
            "results": comparison_results,
            "configuration": {
                "start_date": dates_to_analyze[0],
                "end_date": dates_to_analyze[-1],
                "total_days": len(dates_to_analyze),
                "std_multiplier": std_multiplier,
                "min_duration": min_duration,
                "tolerance": tolerance,
            },
        }

        return jsonify(report), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


# ------------------------------
# Run the Flask app
# ------------------------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5003, debug=True)
