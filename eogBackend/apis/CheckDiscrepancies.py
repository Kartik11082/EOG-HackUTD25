from flask import Flask, jsonify
from flask_cors import CORS
import pandas as pd
import requests
from datetime import datetime

app = Flask(__name__)
CORS(app)

TICKETS_URL = "https://hackutd2025.eog.systems/api/Tickets"
DATA_URL = "https://hackutd2025.eog.systems/api/Data"


def fetch_tickets():
    r = requests.get(TICKETS_URL, timeout=10)
    r.raise_for_status()
    data = r.json().get("transport_tickets", [])
    df = pd.DataFrame(data)
    df["date"] = pd.to_datetime(df["date"]).dt.date
    return df


def fetch_potion_data(start_ts, end_ts):
    url = f"{DATA_URL}?start_date={start_ts}&end_date={end_ts}"
    r = requests.get(url, timeout=10)
    r.raise_for_status()
    return r.json()


def get_daily_drains(data):
    """Sum level drops per cauldron for each day."""
    # print some data for debugging
    # print("check: data", data[:5])
    rows = []
    for entry in data:
        ts = pd.to_datetime(entry["timestamp"])
        for cid, level in entry["cauldron_levels"].items():
            rows.append({"timestamp": ts, "cauldron_id": cid, "level": level})
    df = pd.DataFrame(rows)
    df["date"] = df["timestamp"].dt.date
    # print("check: df", df.head(16))
    # print("check: df", df.tail())
    drains = []
    for (cid, date), group in df.groupby(["cauldron_id", "date"]):
        print(f"Processing cauldron {cid} on date {date}")
        group = group.sort_values("timestamp")
        group["diff"] = group["level"].diff()
        drain_vol = group[group["diff"] < -1]["diff"].abs().sum()
        drains.append({"cauldron_id": cid, "date": date, "drain_volume": drain_vol})
    return pd.DataFrame(drains)


@app.route("/check_discrepancies", methods=["GET"])
def check_discrepancies():
    # For hackathon demo: use last 2 days of available timestamps
    start_ts = 1761800400  # example for oct 30
    end_ts = 1762754340  # example for nov 9

    try:
        tickets_df = fetch_tickets()
        data = fetch_potion_data(start_ts, end_ts)
        drains_df = get_daily_drains(data)
    except Exception as e:
        return jsonify({"error": f"API fetch failed: {e}"}), 500

    results = []
    tolerance = 0.05
    threshold = 5.0

    for _, drow in drains_df.iterrows():
        cid, date, drain = drow
        tmatch = tickets_df[
            (tickets_df["cauldron_id"] == cid) & (tickets_df["date"] == date)
        ]
        ticket_sum = tmatch["amount_collected"].sum() if not tmatch.empty else 0.0
        diff = abs(ticket_sum - drain)
        rel = diff / max(drain, 1e-6)

        if rel <= tolerance or diff <= threshold:
            status = "OK"
        elif ticket_sum > drain:
            status = "OVER_REPORTED"
        elif ticket_sum < drain and ticket_sum > 0:
            status = "UNDER_REPORTED"
        else:
            status = "MISSING_TICKET"

        results.append(
            {
                "cauldron_id": cid,
                "date": str(date),
                "drain_volume": round(drain, 2),
                "ticket_volume": round(ticket_sum, 2),
                "diff": round(diff, 2),
                "relative_diff": round(rel, 3),
                "status": status,
            }
        )

    return jsonify(results), 200


if __name__ == "__main__":
    app.run(port=5002, debug=True)
