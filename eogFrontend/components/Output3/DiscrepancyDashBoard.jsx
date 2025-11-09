import React, { useState, useEffect, useCallback } from 'react';

// available dates for analysis (module-level so hooks can use stable reference)
const AVAILABLE_DATES = [
    '2025-10-30', '2025-10-31', '2025-11-01',
    '2025-11-02', '2025-11-03', '2025-11-04',
    '2025-11-05', '2025-11-06', '2025-11-07', '2025-11-08'
];

const DiscrepancyDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDate, setSelectedDate] = useState('all');
    const [selectedCauldron, setSelectedCauldron] = useState('all');
    const [selectedSeverity, setSelectedSeverity] = useState('all');

    // Available dates for analysis (use module-level constant)
    const availableDates = AVAILABLE_DATES;

    useEffect(() => {
        fetchDiscrepancies();
    }, []);

    // availableDates is a stable module-level constant; disable exhaustive-deps here
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const fetchDiscrepancies = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // Use Vite proxy path. In dev this will be forwarded to http://localhost:5000
            const response = await fetch('http://localhost:5000/detect_daily_discrepancy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // The backend currently expects a `cauldron_data` payload for a single cauldron.
                // Include both the frontend's availableDates and a minimal `cauldron_data` so
                // the backend can accept the request while we iterate on richer responses.
                body: JSON.stringify({
                    cauldron_data: {
                        cauldron_id: 'cauldron_001',
                        date_time: availableDates[0],
                        drain_volume: 100
                    },
                    // keep additional tuning params for future backend changes
                    dates: availableDates,
                    tolerance: 0.05,
                    std_multiplier: 3.0,
                    min_duration: 5
                })
            });

            if (!response.ok) throw new Error('Failed to fetch data');

            const result = await response.json();

            // Normalize backend single-result response into the frontend shape expected by the UI.
            // The Flask endpoint currently returns a single cauldron/day result. Transform it
            // into { summary, discrepancies, by_date, by_cauldron } so the UI can render.
            let payload = result;
            if (result && result.cauldron_id) {
                const rel = Number(result.relative_diff || 0);
                const severity = rel >= 1.0 ? 'critical' : rel > 0.2 ? 'high' : rel > 0.05 ? 'medium' : 'low';

                const disc = {
                    type: (result.status || 'unknown').toLowerCase(),
                    severity,
                    cauldron_id: result.cauldron_id,
                    date: result.date || result.date_time || availableDates[0],
                    ticket_id: result.ticket_id || null,
                    difference: Number(result.difference || 0),
                    difference_pct: Number(result.relative_diff || 0)
                };

                payload = {
                    summary: {
                        total_tickets: Number(result.num_tickets || 0),
                        suspicious_tickets: result.status && result.status !== 'OK' ? 1 : 0,
                        missing_tickets: result.status === 'MISSING_TICKET' ? 1 : 0,
                        ok_matches: result.status === 'OK' ? 1 : 0
                    },
                    discrepancies: [disc],
                    by_date: { [disc.date]: [disc] },
                    by_cauldron: { [disc.cauldron_id]: [disc] }
                };
            }

            setData(payload);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // Filter discrepancies based on selected filters
    const getFilteredDiscrepancies = () => {
        if (!data) return [];

        return data.discrepancies.filter(disc => {
            const dateMatch = selectedDate === 'all' || disc.date === selectedDate;
            const cauldronMatch = selectedCauldron === 'all' || disc.cauldron_id === selectedCauldron;
            const severityMatch = selectedSeverity === 'all' || disc.severity === selectedSeverity;
            return dateMatch && cauldronMatch && severityMatch;
        });
    };

    const filteredDiscrepancies = getFilteredDiscrepancies();

    // Get unique cauldrons for filter
    const uniqueCauldrons = data ?
        [...new Set(data.discrepancies.map(d => d.cauldron_id))].sort() : [];

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p style={styles.loadingText}>Analyzing potion flows...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.errorContainer}>
                <div style={styles.errorIcon}>⚠️</div>
                <h2 style={styles.errorTitle}>Error Loading Data</h2>
                <p style={styles.errorText}>{error}</p>
                <button style={styles.retryButton} onClick={fetchDiscrepancies}>
                    Retry
                </button>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div style={styles.dashboard}>
            {/* Header */}
            <header style={styles.header}>
                <div style={styles.headerContent}>
                    <h1 style={styles.title}>🧙‍♀️ Potion Flow Monitor</h1>
                    <p style={styles.subtitle}>Real-time Discrepancy Detection System</p>
                </div>
                <button style={styles.refreshButton} onClick={fetchDiscrepancies}>
                    🔄 Refresh
                </button>
            </header>

            {/* Summary Cards */}
            <div style={styles.summaryGrid}>
                <SummaryCard
                    title="Total Tickets"
                    value={data.summary.total_tickets}
                    icon="📋"
                    color="#3b82f6"
                />
                <SummaryCard
                    title="Suspicious Tickets"
                    value={data.summary.suspicious_tickets}
                    icon="🚨"
                    color="#ef4444"
                    highlight={data.summary.suspicious_tickets > 0}
                />
                <SummaryCard
                    title="Missing Tickets"
                    value={data.summary.missing_tickets}
                    icon="❌"
                    color="#f59e0b"
                    highlight={data.summary.missing_tickets > 0}
                />
                <SummaryCard
                    title="OK Matches"
                    value={data.summary.ok_matches}
                    icon="✅"
                    color="#10b981"
                />
            </div>

            {/* Filters */}
            <div style={styles.filtersContainer}>
                <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Date:</label>
                    <select
                        style={styles.filterSelect}
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                    >
                        <option value="all">All Dates</option>
                        {Object.keys(data.by_date || {}).map(date => (
                            <option key={date} value={date}>{date}</option>
                        ))}
                    </select>
                </div>

                <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Cauldron:</label>
                    <select
                        style={styles.filterSelect}
                        value={selectedCauldron}
                        onChange={(e) => setSelectedCauldron(e.target.value)}
                    >
                        <option value="all">All Cauldrons</option>
                        {uniqueCauldrons.map(cauldron => (
                            <option key={cauldron} value={cauldron}>{cauldron}</option>
                        ))}
                    </select>
                </div>

                <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Severity:</label>
                    <select
                        style={styles.filterSelect}
                        value={selectedSeverity}
                        onChange={(e) => setSelectedSeverity(e.target.value)}
                    >
                        <option value="all">All Severities</option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </div>

                <div style={styles.filterResults}>
                    Showing {filteredDiscrepancies.length} of {data.discrepancies.length} discrepancies
                </div>
            </div>

            {/* Main Content Grid */}
            <div style={styles.mainGrid}>
                {/* Left Column */}
                <div style={styles.leftColumn}>
                    {/* Cauldron Heatmap */}
                    <div style={styles.card}>
                        <h2 style={styles.cardTitle}>🔥 Problematic Cauldrons</h2>
                        <CauldronHeatmap data={data.by_cauldron} />
                    </div>

                    {/* Timeline */}
                    <div style={styles.card}>
                        <h2 style={styles.cardTitle}>📅 Timeline</h2>
                        <Timeline data={data.by_date} />
                    </div>
                </div>

                {/* Right Column - Discrepancy Table */}
                <div style={styles.rightColumn}>
                    <div style={styles.card}>
                        <h2 style={styles.cardTitle}>📊 Discrepancy Details</h2>
                        <DiscrepancyTable discrepancies={filteredDiscrepancies} />
                    </div>
                </div>
            </div>
        </div>
    );
};

// Summary Card Component
const SummaryCard = ({ title, value, icon, color, highlight }) => (
    <div style={{
        ...styles.summaryCard,
        borderLeft: `4px solid ${color}`,
        backgroundColor: highlight ? `${color}15` : '#fff'
    }}>
        <div style={styles.summaryIcon}>{icon}</div>
        <div style={styles.summaryContent}>
            <div style={styles.summaryTitle}>{title}</div>
            <div style={{ ...styles.summaryValue, color }}>{value}</div>
        </div>
    </div>
);

// Cauldron Heatmap Component
const CauldronHeatmap = ({ data }) => {
    const cauldrons = Object.entries(data || {})
        .map(([id, discs]) => ({
            id,
            count: discs.length,
            critical: discs.filter(d => d.severity === 'critical').length,
            high: discs.filter(d => d.severity === 'high').length
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

    const maxCount = Math.max(...cauldrons.map(c => c.count), 1);

    return (
        <div style={styles.heatmapContainer}>
            {cauldrons.map(cauldron => (
                <div key={cauldron.id} style={styles.heatmapItem}>
                    <div style={styles.heatmapLabel}>{cauldron.id}</div>
                    <div style={styles.heatmapBarContainer}>
                        <div
                            style={{
                                ...styles.heatmapBar,
                                width: `${(cauldron.count / maxCount) * 100}%`,
                                backgroundColor: cauldron.critical > 0 ? '#ef4444' :
                                    cauldron.high > 0 ? '#f59e0b' : '#3b82f6'
                            }}
                        />
                    </div>
                    <div style={styles.heatmapCount}>{cauldron.count}</div>
                </div>
            ))}
        </div>
    );
};

// Timeline Component
const Timeline = ({ data }) => {
    const timeline = Object.entries(data || {})
        .map(([date, discs]) => ({
            date,
            total: discs.length,
            critical: discs.filter(d => d.severity === 'critical').length,
            high: discs.filter(d => d.severity === 'high').length,
            medium: discs.filter(d => d.severity === 'medium').length
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

    const maxTotal = Math.max(...timeline.map(t => t.total), 1);

    return (
        <div style={styles.timelineContainer}>
            {timeline.map(item => (
                <div key={item.date} style={styles.timelineItem}>
                    <div style={styles.timelineDate}>{item.date.slice(5)}</div>
                    <div style={styles.timelineBarContainer}>
                        {item.critical > 0 && (
                            <div
                                style={{
                                    ...styles.timelineSegment,
                                    width: `${(item.critical / maxTotal) * 100}%`,
                                    backgroundColor: '#ef4444'
                                }}
                                title={`${item.critical} critical`}
                            />
                        )}
                        {item.high > 0 && (
                            <div
                                style={{
                                    ...styles.timelineSegment,
                                    width: `${(item.high / maxTotal) * 100}%`,
                                    backgroundColor: '#f59e0b'
                                }}
                                title={`${item.high} high`}
                            />
                        )}
                        {item.medium > 0 && (
                            <div
                                style={{
                                    ...styles.timelineSegment,
                                    width: `${(item.medium / maxTotal) * 100}%`,
                                    backgroundColor: '#3b82f6'
                                }}
                                title={`${item.medium} medium`}
                            />
                        )}
                    </div>
                    <div style={styles.timelineTotal}>{item.total}</div>
                </div>
            ))}
        </div>
    );
};

// Discrepancy Table Component
const DiscrepancyTable = ({ discrepancies }) => {
    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical': return '#ef4444';
            case 'high': return '#f59e0b';
            case 'medium': return '#3b82f6';
            case 'low': return '#10b981';
            default: return '#6b7280';
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'over_reported': return '⬆️';
            case 'under_reported': return '⬇️';
            case 'phantom_ticket': return '👻';
            case 'missing_ticket': return '❌';
            default: return '❓';
        }
    };

    if (discrepancies.length === 0) {
        return (
            <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>✨</div>
                <p style={styles.emptyText}>No discrepancies found with current filters</p>
            </div>
        );
    }

    return (
        <div style={styles.tableContainer}>
            <table style={styles.table}>
                <thead>
                    <tr style={styles.tableHeader}>
                        <th style={styles.th}>Type</th>
                        <th style={styles.th}>Severity</th>
                        <th style={styles.th}>Cauldron</th>
                        <th style={styles.th}>Date</th>
                        <th style={styles.th}>Ticket ID</th>
                        <th style={styles.th}>Difference</th>
                    </tr>
                </thead>
                <tbody>
                    {discrepancies.map((disc, idx) => (
                        <tr key={idx} style={styles.tableRow}>
                            <td style={styles.td}>
                                <span style={styles.typeCell}>
                                    {getTypeIcon(disc.type)} {disc.type.replace('_', ' ')}
                                </span>
                            </td>
                            <td style={styles.td}>
                                <span style={{
                                    ...styles.severityBadge,
                                    backgroundColor: `${getSeverityColor(disc.severity)}20`,
                                    color: getSeverityColor(disc.severity)
                                }}>
                                    {disc.severity}
                                </span>
                            </td>
                            <td style={styles.td}>{disc.cauldron_id}</td>
                            <td style={styles.td}>{disc.date}</td>
                            <td style={styles.td}>{disc.ticket_id || 'N/A'}</td>
                            <td style={styles.td}>
                                {disc.difference ?
                                    `${disc.difference.toFixed(2)} (${(disc.difference_pct * 100).toFixed(1)}%)`
                                    : 'N/A'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// Styles
const styles = {
    dashboard: {
        minHeight: '100vh',
        backgroundColor: '#f3f4f6',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
        backgroundColor: '#1e293b',
        color: 'white',
        padding: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    headerContent: {
        flex: 1
    },
    title: {
        margin: 0,
        fontSize: '2rem',
        fontWeight: 'bold'
    },
    subtitle: {
        margin: '0.5rem 0 0 0',
        opacity: 0.8,
        fontSize: '1rem'
    },
    refreshButton: {
        padding: '0.75rem 1.5rem',
        backgroundColor: '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '1rem',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
    },
    summaryGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        padding: '2rem',
        maxWidth: '1400px',
        margin: '0 auto'
    },
    summaryCard: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        transition: 'transform 0.2s, box-shadow 0.2s'
    },
    summaryIcon: {
        fontSize: '2.5rem'
    },
    summaryContent: {
        flex: 1
    },
    summaryTitle: {
        fontSize: '0.875rem',
        color: '#6b7280',
        marginBottom: '0.25rem'
    },
    summaryValue: {
        fontSize: '2rem',
        fontWeight: 'bold'
    },
    filtersContainer: {
        backgroundColor: 'white',
        padding: '1.5rem',
        margin: '0 2rem',
        borderRadius: '12px',
        display: 'flex',
        gap: '1.5rem',
        alignItems: 'center',
        flexWrap: 'wrap',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    filterGroup: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
    },
    filterLabel: {
        fontSize: '0.875rem',
        fontWeight: '600',
        color: '#374151'
    },
    filterSelect: {
        padding: '0.5rem 1rem',
        borderRadius: '6px',
        border: '1px solid #d1d5db',
        fontSize: '0.875rem',
        cursor: 'pointer'
    },
    filterResults: {
        marginLeft: 'auto',
        fontSize: '0.875rem',
        color: '#6b7280',
        fontWeight: '500'
    },
    mainGrid: {
        display: 'grid',
        gridTemplateColumns: '400px 1fr',
        gap: '1.5rem',
        padding: '2rem',
        maxWidth: '1400px',
        margin: '0 auto'
    },
    leftColumn: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
    },
    rightColumn: {
        display: 'flex',
        flexDirection: 'column'
    },
    card: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    cardTitle: {
        margin: '0 0 1rem 0',
        fontSize: '1.25rem',
        fontWeight: 'bold',
        color: '#1e293b'
    },
    heatmapContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
    },
    heatmapItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
    },
    heatmapLabel: {
        fontSize: '0.75rem',
        fontWeight: '600',
        width: '100px',
        color: '#374151'
    },
    heatmapBarContainer: {
        flex: 1,
        height: '24px',
        backgroundColor: '#f3f4f6',
        borderRadius: '4px',
        overflow: 'hidden'
    },
    heatmapBar: {
        height: '100%',
        transition: 'width 0.3s ease'
    },
    heatmapCount: {
        fontSize: '0.875rem',
        fontWeight: 'bold',
        width: '30px',
        textAlign: 'right',
        color: '#1e293b'
    },
    timelineContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
    },
    timelineItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
    },
    timelineDate: {
        fontSize: '0.75rem',
        fontWeight: '600',
        width: '60px',
        color: '#374151'
    },
    timelineBarContainer: {
        flex: 1,
        height: '20px',
        backgroundColor: '#f3f4f6',
        borderRadius: '4px',
        display: 'flex',
        overflow: 'hidden'
    },
    timelineSegment: {
        height: '100%'
    },
    timelineTotal: {
        fontSize: '0.75rem',
        fontWeight: 'bold',
        width: '30px',
        textAlign: 'right',
        color: '#1e293b'
    },
    tableContainer: {
        overflowX: 'auto',
        maxHeight: '600px',
        overflowY: 'auto'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse'
    },
    tableHeader: {
        backgroundColor: '#f9fafb',
        position: 'sticky',
        top: 0,
        zIndex: 1
    },
    th: {
        padding: '0.75rem',
        textAlign: 'left',
        fontSize: '0.75rem',
        fontWeight: '600',
        color: '#6b7280',
        textTransform: 'uppercase',
        borderBottom: '1px solid #e5e7eb'
    },
    tableRow: {
        borderBottom: '1px solid #e5e7eb',
        transition: 'background-color 0.15s'
    },
    td: {
        padding: '0.75rem',
        fontSize: '0.875rem',
        color: '#374151'
    },
    typeCell: {
        textTransform: 'capitalize'
    },
    severityBadge: {
        display: 'inline-block',
        padding: '0.25rem 0.75rem',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: '600',
        textTransform: 'uppercase'
    },
    loadingContainer: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f3f4f6'
    },
    spinner: {
        width: '50px',
        height: '50px',
        border: '4px solid #e5e7eb',
        borderTop: '4px solid #3b82f6',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    },
    loadingText: {
        marginTop: '1rem',
        fontSize: '1.125rem',
        color: '#6b7280'
    },
    errorContainer: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        padding: '2rem'
    },
    errorIcon: {
        fontSize: '4rem',
        marginBottom: '1rem'
    },
    errorTitle: {
        fontSize: '1.5rem',
        color: '#1e293b',
        marginBottom: '0.5rem'
    },
    errorText: {
        fontSize: '1rem',
        color: '#6b7280',
        marginBottom: '1.5rem'
    },
    retryButton: {
        padding: '0.75rem 2rem',
        backgroundColor: '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '1rem',
        cursor: 'pointer'
    },
    emptyState: {
        textAlign: 'center',
        padding: '3rem',
        color: '#6b7280'
    },
    emptyIcon: {
        fontSize: '3rem',
        marginBottom: '1rem'
    },
    emptyText: {
        fontSize: '1rem'
    }
};

export default DiscrepancyDashboard;