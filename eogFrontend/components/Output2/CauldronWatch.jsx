// import React, { useEffect, useState, useMemo } from "react";
// import Plot from "react-plotly.js";
// import axios from "axios";
// import dayjs from "dayjs";
// import "./CauldronWatch.css";

// const BASE_URL = "/api";

// export default function CauldronWatch() {
//     const [levels, setLevels] = useState([]);
//     const [tickets, setTickets] = useState([]);
//     const [selectedCauldron, setSelectedCauldron] = useState("");
//     const [timeRange, setTimeRange] = useState([null, null]);
//     const [autoRefresh, setAutoRefresh] = useState(true);
//     const [refreshInterval, setRefreshInterval] = useState(60);
//     const [lastUpdated, setLastUpdated] = useState(dayjs());
//     const [timeRangeDays, setTimeRangeDays] = useState(3);

//     // ------------------------
//     // Fetch Cauldron Data
//     // ------------------------
//     const fetchCauldronData = async () => {
//         try {
//             const end = Math.floor(Date.now() / 1000);
//             const start = end - timeRangeDays * 24 * 3600;

//             const res = await axios.get(`${BASE_URL}/Data?start_date=${start}&end_date=${end}`, {
//                 timeout: 10000,
//                 responseType: "text",
//             });

//             let raw = res.data;
//             if (typeof raw !== "string" || raw.trim().startsWith("<!DOCTYPE html")) {
//                 console.error("Invalid or HTML response for /Data");
//                 setLevels([]);
//                 return;
//             }

//             const data = JSON.parse(raw);
//             const rows = [];
//             data.forEach((entry) => {
//                 const ts = new Date(entry.timestamp);
//                 for (const [cid, level] of Object.entries(entry.cauldron_levels)) {
//                     rows.push({ timestamp: ts, cauldron_id: cid, volume: level });
//                 }
//             });
//             setLevels(rows);
//         } catch (err) {
//             console.error("❌ Error loading cauldron data:", err);
//             setLevels([]);
//         }
//     };

//     const fetchTicketData = async () => {
//         try {
//             const end = Math.floor(Date.now() / 1000);
//             const start = end - timeRangeDays * 24 * 3600;

//             const res = await axios.get(`${BASE_URL}/Tickets?start_date=${start}&end_date=${end}`, {
//                 timeout: 10000,
//                 responseType: "text",
//             });

//             let raw = res.data;
//             if (typeof raw !== "string" || raw.trim().startsWith("<!DOCTYPE html")) {
//                 console.error("Invalid or HTML response for /Tickets");
//                 setTickets([]);
//                 return;
//             }

//             const data = JSON.parse(raw);
//             if (!data?.transport_tickets) {
//                 console.warn("No ticket data found in range");
//                 setTickets([]);
//                 return;
//             }

//             const df = data.transport_tickets.map((t) => ({
//                 ...t,
//                 date: new Date(t.date),
//             }));
//             setTickets(df);
//         } catch (err) {
//             console.error("❌ Error loading ticket data:", err);
//             setTickets([]);
//         }
//     };

//     // ------------------------
//     // Auto Refresh Handling
//     // ------------------------
//     useEffect(() => {
//         fetchCauldronData();
//         fetchTicketData();
//         setLastUpdated(dayjs());
//     }, [timeRangeDays]);

//     useEffect(() => {
//         if (!autoRefresh) return;
//         const interval = setInterval(() => {
//             fetchCauldronData();
//             fetchTicketData();
//             setLastUpdated(dayjs());
//         }, refreshInterval * 1000);
//         return () => clearInterval(interval);
//     }, [autoRefresh, refreshInterval]);

//     // ------------------------
//     // Filtered Data + Drain Detection
//     // ------------------------
//     const cauldronOptions = useMemo(() => {
//         const ids = [...new Set(levels.map((d) => d.cauldron_id))].sort();
//         return ids;
//     }, [levels]);

//     useEffect(() => {
//         if (!selectedCauldron && cauldronOptions.length > 0)
//             setSelectedCauldron(cauldronOptions[0]);
//     }, [cauldronOptions]);

//     const subset = useMemo(() => {
//         if (!selectedCauldron) return [];
//         const data = levels
//             .filter((d) => d.cauldron_id === selectedCauldron)
//             .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
//         if (timeRange[0] && timeRange[1]) {
//             return data.filter(
//                 (d) =>
//                     new Date(d.timestamp) >= new Date(timeRange[0]) &&
//                     new Date(d.timestamp) <= new Date(timeRange[1])
//             );
//         }
//         return data;
//     }, [levels, selectedCauldron, timeRange]);

//     // Drain detection algorithm
//     const drainPeriods = useMemo(() => {
//         if (subset.length < 2) return [];
//         const windowSize = Math.min(50, Math.floor(subset.length / 20));
//         if (windowSize < 2) return [];
//         const smooth = subset.map((_, i) => {
//             const start = Math.max(0, i - windowSize / 2);
//             const end = Math.min(subset.length, i + windowSize / 2);
//             const slice = subset.slice(start, end);
//             return slice.reduce((acc, cur) => acc + cur.volume, 0) / slice.length;
//         });

//         const periods = [];
//         let inDrain = false;
//         let drainStartIdx = 0;
//         let drainStartVol = 0;
//         const minDrop = 5;

//         for (let i = 1; i < smooth.length; i++) {
//             if (smooth[i] < smooth[i - 1] - 0.1) {
//                 if (!inDrain) {
//                     inDrain = true;
//                     drainStartIdx = i;
//                     drainStartVol = smooth[i];
//                 }
//             } else if (inDrain) {
//                 const totalDrop = drainStartVol - smooth[i - 1];
//                 if (totalDrop >= minDrop) {
//                     periods.push([drainStartIdx, i - 1]);
//                 }
//                 inDrain = false;
//             }
//         }
//         return periods;
//     }, [subset]);

//     // Ticket filter
//     const cauldronTickets = useMemo(() => {
//         return tickets.filter(
//             (t) =>
//                 t.cauldron_id === selectedCauldron &&
//                 (!timeRange[0] ||
//                     (new Date(t.date) >= new Date(timeRange[0]) &&
//                         new Date(t.date) <= new Date(timeRange[1])))
//         );
//     }, [tickets, selectedCauldron, timeRange]);

//     // ------------------------
//     // Plotly Figure
//     // ------------------------
//     const plotData = [
//         {
//             x: subset.map((d) => d.timestamp),
//             y: subset.map((d) => d.volume),
//             type: "scatter",
//             mode: "lines",
//             name: "Potion Volume (L)",
//             line: { color: "royalblue" },
//         },
//     ];

//     const shapes = [];
//     const annotations = [];

//     drainPeriods.forEach(([startIdx, endIdx]) => {
//         const start = subset[startIdx];
//         const end = subset[endIdx];
//         shapes.push({
//             type: "rect",
//             x0: start.timestamp,
//             x1: end.timestamp,
//             y0: 0,
//             y1: 1,
//             yref: "paper",
//             fillcolor: "yellow",
//             opacity: 0.1,
//             line: { width: 0 },
//         });
//         annotations.push(
//             {
//                 x: start.timestamp,
//                 y: start.volume,
//                 text: "Drain Start",
//                 showarrow: true,
//                 arrowcolor: "yellow",
//                 font: { size: 9, color: "yellow" },
//             },
//             {
//                 x: end.timestamp,
//                 y: end.volume,
//                 text: "Drain End",
//                 showarrow: true,
//                 arrowcolor: "yellow",
//                 font: { size: 9, color: "yellow" },
//             }
//         );
//     });

//     cauldronTickets.forEach((t) => {
//         shapes.push({
//             type: "line",
//             x0: t.date,
//             x1: t.date,
//             y0: 0,
//             y1: 1,
//             yref: "paper",
//             line: { color: "red", width: 2, dash: "dash" },
//         });
//         annotations.push({
//             x: t.date,
//             y: 1,
//             yref: "paper",
//             text: `${t.ticket_id} (${t.amount_collected}L)`,
//             showarrow: false,
//             font: { size: 10, color: "red" },
//         });
//     });

//     const layout = {
//         title: `Potion Level Time Series - ${selectedCauldron}`,
//         xaxis: { title: "Time" },
//         yaxis: { title: "Volume (Liters)" },
//         height: 500,
//         shapes,
//         annotations,
//         template: "plotly_white",
//     };

//     // ------------------------
//     // Summary Stats
//     // ------------------------
//     const stats = useMemo(() => {
//         if (subset.length === 0) return {};
//         const vols = subset.map((d) => d.volume);
//         return {
//             avg: (vols.reduce((a, b) => a + b, 0) / vols.length).toFixed(2),
//             max: Math.max(...vols).toFixed(2),
//             min: Math.min(...vols).toFixed(2),
//         };
//     }, [subset]);

//     return (
//         <div className="cauldron-container">
//             <h1 className="cauldron-header">🧪 CauldronWatch: Potion Level Time Series & Ticket Overlay</h1>

//             <div className="controls">
//                 <div className="control-group">
//                     <label>Select Cauldron</label>
//                     <select value={selectedCauldron} onChange={(e) => setSelectedCauldron(e.target.value)}>
//                         {cauldronOptions.map((c) => (
//                             <option key={c} value={c}>
//                                 {c}
//                             </option>
//                         ))}
//                     </select>
//                 </div>

//                 <div className="control-group">
//                     <label>Auto-Refresh</label>
//                     <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
//                 </div>

//                 <div className="control-group">
//                     <label>Interval (sec)</label>
//                     <select value={refreshInterval} onChange={(e) => setRefreshInterval(parseInt(e.target.value))}>
//                         {[30, 60, 120, 300].map((s) => (
//                             <option key={s} value={s}>
//                                 {s}
//                             </option>
//                         ))}
//                     </select>
//                 </div>

//                 <div className="control-group">
//                     <label>Data Range</label>
//                     <select value={timeRangeDays} onChange={(e) => setTimeRangeDays(parseInt(e.target.value))}>
//                         {[1, 3, 7, 14, 30].map((d) => (
//                             <option key={d} value={d}>
//                                 Last {d} days
//                             </option>
//                         ))}
//                     </select>
//                 </div>

//                 <div className="control-group">
//                     <label>Last Updated</label>
//                     <div>{lastUpdated.format("YYYY-MM-DD HH:mm:ss")}</div>
//                 </div>
//             </div>

//             <Plot data={plotData} layout={layout} useResizeHandler style={{ width: "100%" }} />

//             {subset.length > 0 && (
//                 <div className="stats-grid">
//                     <div className="stats-card">
//                         <div>Average Level (L)</div>
//                         <div className="value">{stats.avg}</div>
//                     </div>
//                     <div className="stats-card">
//                         <div>Max Level (L)</div>
//                         <div className="value">{stats.max}</div>
//                     </div>
//                     <div className="stats-card">
//                         <div>Min Level (L)</div>
//                         <div className="value">{stats.min}</div>
//                     </div>
//                 </div>
//             )}

//             <div className="ticket-section">
//                 <h2>📜 Transport Tickets for {selectedCauldron}</h2>
//                 {cauldronTickets.length > 0 ? (
//                     <table className="ticket-table">
//                         <thead>
//                             <tr>
//                                 <th>Ticket ID</th>
//                                 <th>Courier</th>
//                                 <th>Collected (L)</th>
//                                 <th>Date</th>
//                             </tr>
//                         </thead>
//                         <tbody>
//                             {cauldronTickets.map((t) => (
//                                 <tr key={t.ticket_id}>
//                                     <td>{t.ticket_id}</td>
//                                     <td>{t.courier_id}</td>
//                                     <td>{t.amount_collected}</td>
//                                     <td>{dayjs(t.date).format("YYYY-MM-DD HH:mm")}</td>
//                                 </tr>
//                             ))}
//                         </tbody>
//                     </table>
//                 ) : (
//                     <div className="ticket-empty">
//                         No transport tickets found for this cauldron in the selected time range.
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// }


import React, { useEffect, useState, useMemo } from "react";
import Plot from "react-plotly.js";
import axios from "axios";
import dayjs from "dayjs";
import "./CauldronWatch.css";

const BASE_URL = "/api";

export default function CauldronWatch() {
    const [levels, setLevels] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [selectedCauldron, setSelectedCauldron] = useState("");
    const [timeRange, setTimeRange] = useState([null, null]);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [refreshInterval, setRefreshInterval] = useState(60);
    const [lastUpdated, setLastUpdated] = useState(dayjs());
    const [timeRangeDays, setTimeRangeDays] = useState(3);

    const fetchCauldronData = async () => {
        try {
            const end = Math.floor(Date.now() / 1000);
            const start = end - timeRangeDays * 24 * 3600;

            const res = await axios.get(`${BASE_URL}/Data?start_date=${start}&end_date=${end}`, {
                timeout: 10000,
                responseType: "text",
            });

            let raw = res.data;
            if (typeof raw !== "string" || raw.trim().startsWith("<!DOCTYPE html")) {
                console.error("Invalid or HTML response for /Data");
                setLevels([]);
                return;
            }

            const data = JSON.parse(raw);
            const rows = [];
            data.forEach((entry) => {
                const ts = new Date(entry.timestamp);
                for (const [cid, level] of Object.entries(entry.cauldron_levels)) {
                    rows.push({ timestamp: ts, cauldron_id: cid, volume: level });
                }
            });
            setLevels(rows);
        } catch (err) {
            console.error("❌ Error loading cauldron data:", err);
            setLevels([]);
        }
    };

    const fetchTicketData = async () => {
        try {
            const end = Math.floor(Date.now() / 1000);
            const start = end - timeRangeDays * 24 * 3600;

            const res = await axios.get(`${BASE_URL}/Tickets?start_date=${start}&end_date=${end}`, {
                timeout: 10000,
                responseType: "text",
            });

            let raw = res.data;
            if (typeof raw !== "string" || raw.trim().startsWith("<!DOCTYPE html")) {
                console.error("Invalid or HTML response for /Tickets");
                setTickets([]);
                return;
            }

            const data = JSON.parse(raw);
            if (!data?.transport_tickets) {
                console.warn("No ticket data found in range");
                setTickets([]);
                return;
            }

            const df = data.transport_tickets.map((t) => ({
                ...t,
                date: new Date(t.date),
            }));
            setTickets(df);
        } catch (err) {
            console.error("❌ Error loading ticket data:", err);
            setTickets([]);
        }
    };

    useEffect(() => {
        fetchCauldronData();
        fetchTicketData();
        setLastUpdated(dayjs());
    }, [timeRangeDays]);

    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => {
            fetchCauldronData();
            fetchTicketData();
            setLastUpdated(dayjs());
        }, refreshInterval * 1000);
        return () => clearInterval(interval);
    }, [autoRefresh, refreshInterval]);

    const cauldronOptions = useMemo(() => {
        const ids = [...new Set(levels.map((d) => d.cauldron_id))].sort();
        return ids;
    }, [levels]);

    useEffect(() => {
        if (!selectedCauldron && cauldronOptions.length > 0)
            setSelectedCauldron(cauldronOptions[0]);
    }, [cauldronOptions]);

    const subset = useMemo(() => {
        if (!selectedCauldron) return [];
        const data = levels
            .filter((d) => d.cauldron_id === selectedCauldron)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        if (timeRange[0] && timeRange[1]) {
            return data.filter(
                (d) =>
                    new Date(d.timestamp) >= new Date(timeRange[0]) &&
                    new Date(d.timestamp) <= new Date(timeRange[1])
            );
        }
        return data;
    }, [levels, selectedCauldron, timeRange]);

    const drainPeriods = useMemo(() => {
        if (subset.length < 2) return [];
        const windowSize = Math.min(50, Math.floor(subset.length / 20));
        if (windowSize < 2) return [];
        const smooth = subset.map((_, i) => {
            const start = Math.max(0, i - windowSize / 2);
            const end = Math.min(subset.length, i + windowSize / 2);
            const slice = subset.slice(start, end);
            return slice.reduce((acc, cur) => acc + cur.volume, 0) / slice.length;
        });

        const periods = [];
        let inDrain = false;
        let drainStartIdx = 0;
        let drainStartVol = 0;
        const minDrop = 5;

        for (let i = 1; i < smooth.length; i++) {
            if (smooth[i] < smooth[i - 1] - 0.1) {
                if (!inDrain) {
                    inDrain = true;
                    drainStartIdx = i;
                    drainStartVol = smooth[i];
                }
            } else if (inDrain) {
                const totalDrop = drainStartVol - smooth[i - 1];
                if (totalDrop >= minDrop) {
                    periods.push([drainStartIdx, i - 1]);
                }
                inDrain = false;
            }
        }
        return periods;
    }, [subset]);

    const cauldronTickets = useMemo(() => {
        return tickets.filter(
            (t) =>
                t.cauldron_id === selectedCauldron &&
                (!timeRange[0] ||
                    (new Date(t.date) >= new Date(timeRange[0]) &&
                        new Date(t.date) <= new Date(timeRange[1])))
        );
    }, [tickets, selectedCauldron, timeRange]);

    const plotData = [
        {
            x: subset.map((d) => d.timestamp),
            y: subset.map((d) => d.volume),
            type: "scatter",
            mode: "lines",
            name: "Potion Volume (L)",
            line: { color: "royalblue" },
        },
    ];

    const shapes = [];
    const annotations = [];

    drainPeriods.forEach(([startIdx, endIdx]) => {
        const start = subset[startIdx];
        const end = subset[endIdx];
        shapes.push({
            type: "rect",
            x0: start.timestamp,
            x1: end.timestamp,
            y0: 0,
            y1: 1,
            yref: "paper",
            fillcolor: "yellow",
            opacity: 0.1,
            line: { width: 0 },
        });
        annotations.push(
            {
                x: start.timestamp,
                y: start.volume,
                text: "Drain Start",
                showarrow: true,
                arrowcolor: "yellow",
                font: { size: 9, color: "yellow" },
            },
            {
                x: end.timestamp,
                y: end.volume,
                text: "Drain End",
                showarrow: true,
                arrowcolor: "yellow",
                font: { size: 9, color: "yellow" },
            }
        );
    });

    cauldronTickets.forEach((t) => {
        shapes.push({
            type: "line",
            x0: t.date,
            x1: t.date,
            y0: 0,
            y1: 1,
            yref: "paper",
            line: { color: "red", width: 2, dash: "dash" },
        });
        annotations.push({
            x: t.date,
            y: 1,
            yref: "paper",
            text: `${t.ticket_id} (${t.amount_collected}L)`,
            showarrow: false,
            font: { size: 10, color: "red" },
        });
    });

    const layout = {
        title: `Potion Level Time Series - ${selectedCauldron}`,
        template: "plotly_dark", // switch to dark theme
        plot_bgcolor: "#0b0c10", // plotting area background
        paper_bgcolor: "#0b0c10", // surrounding background
        font: { color: "#e5e7eb" },
        xaxis: {
            title: "Time",
            tickfont: { color: "#e5e7eb" },
            titlefont: { color: "#e5e7eb" },
            gridcolor: "#374151",
            zerolinecolor: "#374151",
        },
        yaxis: {
            title: "Volume (Liters)",
            tickfont: { color: "#e5e7eb" },
            titlefont: { color: "#e5e7eb" },
            gridcolor: "#374151",
            zerolinecolor: "#374151",
        },
        height: 500,
        shapes,
        annotations,
    };

    return (
        <div className="cauldron-container">
            <h1 className="cauldron-header">🧪 CauldronWatch: Potion Level Time Series & Ticket Overlay</h1>

            <div className="controls">
                <div className="control-group">
                    <label>Select Cauldron</label>
                    <select value={selectedCauldron} onChange={(e) => setSelectedCauldron(e.target.value)}>
                        {cauldronOptions.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="control-group">
                    <label>Auto-Refresh</label>
                    <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
                </div>

                <div className="control-group">
                    <label>Interval (sec)</label>
                    <select value={refreshInterval} onChange={(e) => setRefreshInterval(parseInt(e.target.value))}>
                        {[30, 60, 120, 300].map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="control-group">
                    <label>Data Range</label>
                    <select value={timeRangeDays} onChange={(e) => setTimeRangeDays(parseInt(e.target.value))}>
                        {[1, 3, 7, 14, 30].map((d) => (
                            <option key={d} value={d}>
                                Last {d} days
                            </option>
                        ))}
                    </select>
                </div>

                <div className="control-group">
                    <label>Last Updated</label>
                    <div>{lastUpdated.format("YYYY-MM-DD HH:mm:ss")}</div>
                </div>
            </div>

            <Plot data={plotData} layout={layout} useResizeHandler style={{ width: "100%" }} />

            {subset.length > 0 && (
                <div className="stats-grid">
                    <div className="stats-card">
                        <div>Average Level (L)</div>
                        <div className="value">
                            {(() => {
                                const vols = subset.map((d) => d.volume);
                                const avg = (vols.reduce((a, b) => a + b, 0) / vols.length).toFixed(2);
                                return avg;
                            })()}
                        </div>
                    </div>
                    <div className="stats-card">
                        <div>Max Level (L)</div>
                        <div className="value">{Math.max(...subset.map((d) => d.volume)).toFixed(2)}</div>
                    </div>
                    <div className="stats-card">
                        <div>Min Level (L)</div>
                        <div className="value">{Math.min(...subset.map((d) => d.volume)).toFixed(2)}</div>
                    </div>
                </div>
            )}

            <div className="ticket-section">
                <h2>📜 Transport Tickets for {selectedCauldron}</h2>
                {cauldronTickets.length > 0 ? (
                    <table className="ticket-table">
                        <thead>
                            <tr>
                                <th>Ticket ID</th>
                                <th>Courier</th>
                                <th>Collected (L)</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cauldronTickets.map((t) => (
                                <tr key={t.ticket_id}>
                                    <td>{t.ticket_id}</td>
                                    <td>{t.courier_id}</td>
                                    <td>{t.amount_collected}</td>
                                    <td>{dayjs(t.date).format("YYYY-MM-DD HH:mm")}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="ticket-empty">No transport tickets found for this cauldron in the selected time range.</div>
                )}
            </div>
        </div>
    );
}
