import React, { useEffect, useState } from "react";

export default function DiscrepancyVisualizer() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch("http://127.0.0.1:5003/compare", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        dates_to_analyze: [
                            "2025-10-30",
                            "2025-11-09",
                        ],
                        std_multiplier: 5.0,
                        min_duration: 1,
                        tolerance: 15.0,
                    }),
                });
                const json = await res.json();
                setData(json);
            } catch (err) {
                console.error("Error fetching discrepancy data:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) return <p style={styles.loading}>🧪 Analyzing potion discrepancies...</p>;
    if (!data || !data.results) return <p style={styles.error}>No data available</p>;

    const results = data.results;
    const summary = {
        total: results.length,
        matches: results.filter(r => r.status === "MATCH").length,
        mismatches: results.filter(r => r.status === "MISMATCH").length,
        missingTickets: results.filter(r => r.status === "TICKET_MISSING").length,
        missingDrains: results.filter(r => r.status === "DRAIN_NOT_DETECTED").length,
    };

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>🧙 Potion Discrepancy Dashboard</h1>

            {/* Summary Cards */}
            <div style={styles.summaryGrid}>
                <SummaryCard label="Total Records" value={summary.total} color="#3b82f6" />
                <SummaryCard label="Matches" value={summary.matches} color="#10b981" />
                <SummaryCard label="Mismatches" value={summary.mismatches} color="#ef4444" />
                <SummaryCard label="Missing Tickets" value={summary.missingTickets} color="#f97316" />
                <SummaryCard label="Drains Not Detected" value={summary.missingDrains} color="#facc15" />
            </div>

            {/* Table */}
            <table style={styles.table}>
                <thead>
                    <tr style={styles.thead}>
                        <th>Cauldron ID</th>
                        <th>Date</th>
                        <th>Ticket Amount</th>
                        <th>Drain Volume</th>
                        <th>Difference</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {results.map((r, i) => (
                        <tr key={i} style={{ ...styles.row, background: rowColor(r.status) }}>
                            <td>{r.cauldron_id}</td>
                            <td>{r.date}</td>
                            <td>{r.ticket_amount}</td>
                            <td>{r.drain_volume}</td>
                            <td>{r.difference}</td>
                            <td><b>{r.status}</b></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/* Utility Component for Summary Cards */
function SummaryCard({ label, value, color }) {
    return (
        <div style={{ ...styles.card, borderLeft: `6px solid ${color}` }}>
            <p style={styles.cardLabel}>{label}</p>
            <h2 style={{ ...styles.cardValue, color }}>{value}</h2>
        </div>
    );
}

/* Utility for row colors */
function rowColor(status) {
    switch (status) {
        case "MATCH": return "#dcfce7";
        case "MISMATCH": return "#fee2e2";
        case "TICKET_MISSING": return "#ffedd5";
        case "DRAIN_NOT_DETECTED": return "#fef9c3";
        default: return "#f3f4f6";
    }
}

/* Styles */
const styles = {
    container: {
        fontFamily: "Inter, sans-serif",
        padding: "2rem",
        background: "#f9fafb",
        minHeight: "100vh",
    },
    title: {
        textAlign: "center",
        color: "#1e293b",
    },
    summaryGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "1rem",
        margin: "1.5rem 0",
    },
    card: {
        background: "white",
        padding: "1rem",
        borderRadius: "8px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    },
    cardLabel: {
        fontSize: "0.9rem",
        color: "#6b7280",
    },
    cardValue: {
        fontSize: "1.8rem",
        fontWeight: "bold",
        margin: 0,
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        background: "white",
        borderRadius: "8px",
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    },
    thead: {
        background: "#1e3a8a",
        color: "white",
        textAlign: "left",
    },
    row: {
        borderBottom: "1px solid #e5e7eb",
    },
    loading: {
        textAlign: "center",
        marginTop: "3rem",
        fontSize: "1.2rem",
        color: "#475569",
    },
    error: {
        textAlign: "center",
        color: "#dc2626",
        marginTop: "2rem",
    },
};
