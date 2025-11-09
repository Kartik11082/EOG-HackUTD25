import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './PotionNetworkMap.css';

// Custom cauldron icon
const createCauldronIcon = (color) => {
    return new L.DivIcon({
        html: `
      <div style="position: relative; width: 40px; height: 40px;">
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="20" cy="32" rx="12" ry="4" fill="#333" opacity="0.3"/>
          <path d="M 12 18 Q 10 25, 12 30 L 28 30 Q 30 25, 28 18 Z" fill="${color}" stroke="#222" stroke-width="1.5"/>
          <ellipse cx="20" cy="18" rx="8" ry="2.5" fill="${color}" stroke="#222" stroke-width="1.5"/>
          <path d="M 11 20 Q 8 20, 8 23 Q 8 25, 11 25" fill="none" stroke="#222" stroke-width="2"/>
          <path d="M 29 20 Q 32 20, 32 23 Q 32 25, 29 25" fill="none" stroke="#222" stroke-width="2"/>
          <circle cx="18" cy="22" r="1.5" fill="#fff" opacity="0.6"/>
          <circle cx="22" cy="24" r="1.2" fill="#fff" opacity="0.6"/>
          <circle cx="20" cy="26" r="1" fill="#fff" opacity="0.4"/>
        </svg>
      </div>
    `,
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 35]
    });
};

const marketIcon = new L.DivIcon({
    html: `
    <div style="position: relative; width: 50px; height: 50px;">
      <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
        <circle cx="25" cy="25" r="20" fill="#9b59b6" opacity="0.3"/>
        <circle cx="25" cy="25" r="15" fill="#8e44ad" opacity="0.5"/>
        <circle cx="25" cy="25" r="12" fill="#6c3483" stroke="#fff" stroke-width="2"/>
        <path d="M 25 15 L 27 21 L 33 21 L 28 25 L 30 31 L 25 27 L 20 31 L 22 25 L 17 21 L 23 21 Z" fill="#fff" stroke="#ffd700" stroke-width="0.5"/>
        <circle cx="15" cy="15" r="1.5" fill="#fff"/>
        <circle cx="35" cy="15" r="1" fill="#fff"/>
        <circle cx="35" cy="35" r="1.5" fill="#fff"/>
        <circle cx="15" cy="35" r="1" fill="#fff"/>
      </svg>
    </div>
  `,
    className: '',
    iconSize: [50, 50],
    iconAnchor: [25, 25]
});

function CurvedArrow({ positions, color }) {
    const map = useMap();
    useEffect(() => {
        const start = positions[0];
        const end = positions[1];
        const midLat = (start[0] + end[0]) / 2;
        const midLon = (start[1] + end[1]) / 2;
        const dx = end[1] - start[1];
        const dy = end[0] - start[0];
        const dist = Math.sqrt(dx * dx + dy * dy);
        const offset = dist * 0.15;
        const controlLat = midLat - (dx / dist) * offset;
        const controlLon = midLon + (dy / dist) * offset;
        const curvePoints = [];
        for (let t = 0; t <= 1; t += 0.05) {
            const lat = Math.pow(1 - t, 2) * start[0] + 2 * (1 - t) * t * controlLat + Math.pow(t, 2) * end[0];
            const lon = Math.pow(1 - t, 2) * start[1] + 2 * (1 - t) * t * controlLon + Math.pow(t, 2) * end[1];
            curvePoints.push([lat, lon]);
        }
        const deepShadow = L.polyline(curvePoints, { color: '#000', weight: 10, opacity: 0.35, offset: 3 }).addTo(map);
        const midShadow = L.polyline(curvePoints, { color: '#000', weight: 8, opacity: 0.25, offset: 2 }).addTo(map);
        const darkBase = L.polyline(curvePoints, {
            color: color === '#c0392b' ? '#8b1a1a' : '#0d3a5c',
            weight: 7,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round'
        }).addTo(map);
        const mainPath = L.polyline(curvePoints, {
            color: color,
            weight: 6,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round'
        }).addTo(map);
        const topHighlight = L.polyline(curvePoints, { color: '#fff', weight: 2.5, opacity: 0.4, offset: -1.5 }).addTo(map);
        const edgeGlow = L.polyline(curvePoints, {
            color: color === '#c0392b' ? '#ff5252' : '#4fc3f7',
            weight: 2,
            opacity: 0.5,
            offset: 2
        }).addTo(map);
        let dashOffset = 0;
        const animatePath = L.polyline(curvePoints, {
            color: color === '#c0392b' ? '#5a0f0f' : '#082840',
            weight: 4,
            opacity: 0.85,
            dashArray: '12, 18',
            dashOffset: 0,
            lineCap: 'round'
        }).addTo(map);
        const animationInterval = setInterval(() => {
            dashOffset = (dashOffset - 1) % 25;
            animatePath.setStyle({ dashOffset: dashOffset });
        }, 50);
        // Add arrow markers for directional flow
        const arrowMarkers = [];
        [0.35, 0.65, 0.9].forEach(t => {
            const arrowLat = Math.pow(1 - t, 2) * start[0] + 2 * (1 - t) * t * controlLat + Math.pow(t, 2) * end[0];
            const arrowLon = Math.pow(1 - t, 2) * start[1] + 2 * (1 - t) * t * controlLon + Math.pow(t, 2) * end[1];
            const dt = 0.01;
            const nextT = t + dt;
            const nextLat = Math.pow(1 - nextT, 2) * start[0] + 2 * (1 - nextT) * nextT * controlLat + Math.pow(nextT, 2) * end[0];
            const nextLon = Math.pow(1 - nextT, 2) * start[1] + 2 * (1 - nextT) * nextT * controlLon + Math.pow(nextT, 2) * end[1];
            const angle = Math.atan2(nextLat - arrowLat, nextLon - arrowLon) * 180 / Math.PI;
            const arrow = L.marker([arrowLat, arrowLon], {
                icon: L.divIcon({
                    html: `
            <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 10px solid ${color}; transform: rotate(${angle}deg); filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));"></div>
            `,
                    className: '',
                    iconSize: [12, 10],
                    iconAnchor: [6, 5]
                }),
                zIndexOffset: 500
            }).addTo(map);
            arrowMarkers.push(arrow);
        });
        return () => {
            clearInterval(animationInterval);
            map.removeLayer(deepShadow);
            map.removeLayer(midShadow);
            map.removeLayer(darkBase);
            map.removeLayer(mainPath);
            map.removeLayer(topHighlight);
            map.removeLayer(edgeGlow);
            map.removeLayer(animatePath);
            arrowMarkers.forEach(arrow => map.removeLayer(arrow));
        };
    }, [positions, color, map]);
    return null;
}

function TravelTimeLabel({ positions, time, color }) {
    const map = useMap();
    useEffect(() => {
        const start = positions[0];
        const end = positions[1];
        const midLat = (start[0] + end[0]) / 2;
        const midLon = (start[1] + end[1]) / 2;
        const dx = end[1] - start[1];
        const dy = end[0] - start[0];
        const dist = Math.sqrt(dx * dx + dy * dy);
        const offset = dist * 0.15;
        const controlLat = midLat - (dx / dist) * offset;
        const controlLon = midLon + (dy / dist) * offset;
        const t = 0.5;
        const labelLat = Math.pow(1 - t, 2) * start[0] + 2 * (1 - t) * t * controlLat + Math.pow(t, 2) * end[0];
        const labelLon = Math.pow(1 - t, 2) * start[1] + 2 * (1 - t) * t * controlLon + Math.pow(t, 2) * end[1];
        const borderColor = color === '#c0392b' ? '#8b1a1a' : '#0d3a5c';
        const divIcon = L.divIcon({
            html: `
        <div style="position: relative; display: inline-flex; justify-content: center; align-items: center; background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%); color: ${color}; font-family: 'Segoe UI', Roboto, sans-serif; font-weight: 700; font-size: 11px; padding: 2px 8px; border-radius: 16px; border: 2.5px solid ${borderColor}; box-shadow: 0 5px 15px rgba(0,0,0,0.25), 0 3px 6px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(0,0,0,0.1); text-align: center; white-space: nowrap; letter-spacing: 0.3px;">
            <span style="display: inline-block; margin-right: 4px; font-size: 13px;">⏱</span>
            ${time} min
        </div>
        `,
            className: '',
            iconSize: [90, 28],
            iconAnchor: [45, 14]
        });
        const marker = L.marker([labelLat, labelLon], { icon: divIcon, zIndexOffset: 1000 }).addTo(map);
        return () => map.removeLayer(marker);
    }, [positions, time, color, map]);
    return null;
}

function PotionNetworkMap() {
    const [cauldrons, setCauldrons] = useState([]);
    const [currentLevels, setCurrentLevels] = useState({});
    const [market, setMarket] = useState(null);
    const [edges, setEdges] = useState([]);
    const [timestamp, setTimestamp] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [loadingStatus, setLoadingStatus] = useState('Starting...');
    const startDateRef = useRef(1761782400);
    const endDateRef = useRef(1761782400);

    const fetchData = async () => {
        try {
            setError(null);
            setLoadingStatus('Fetching cauldrons...');
            const cauldronResp = await fetch('/api/Information/cauldrons');
            if (!cauldronResp.ok) throw new Error('Failed to fetch cauldrons');
            const cauldronData = await cauldronResp.json();
            setCauldrons(cauldronData);
            setLoadingStatus('Fetching levels...');
            console.log(`Fetching data with start_date=${startDateRef.current}, end_date=${endDateRef.current}`);
            const levelsResp = await fetch(`/api/Data?start_date=${startDateRef.current}&end_date=${endDateRef.current}`);
            if (!levelsResp.ok) throw new Error('Failed to fetch levels');
            const levelsData = await levelsResp.json();
            console.log('API Response:', levelsData);

            if (!levelsData || levelsData.length === 0) {
                console.warn('No data returned from API for this time range');
                // Still increment for next call
                startDateRef.current += 60;
                endDateRef.current += 60;
                return;
            }

            const latest = levelsData[0];
            console.log('Latest data:', latest);
            // Convert Unix timestamp to readable datetime format (UTC)
            const formattedTimestamp = new Date(startDateRef.current * 1000).toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
                timeZone: 'UTC'
            }) + ' UTC';
            setTimestamp(formattedTimestamp);
            setCurrentLevels(latest.cauldron_levels);
            console.log('Updated levels:', latest.cauldron_levels);
            // Increment start_date and end_date by 60 for next call
            startDateRef.current += 60;
            endDateRef.current += 60;
            setLoadingStatus('Fetching market...');
            const marketResp = await fetch('/api/Information/market');
            if (!marketResp.ok) throw new Error('Failed to fetch market');
            const marketData = await marketResp.json();
            setMarket(marketData);
            setLoadingStatus('Fetching network...');
            const networkResp = await fetch('/api/Information/network');
            if (!networkResp.ok) throw new Error('Failed to fetch network');
            const networkData = await networkResp.json();
            setEdges(networkData.edges);
            setLoading(false);
            setLoadingStatus('Complete!');
        } catch (error) {
            console.error('Error fetching data:', error);
            setError(error.message);
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);
    useEffect(() => {
        const interval = setInterval(() => { fetchData(); }, 60000);
        return () => clearInterval(interval);
    }, []);

    if (error) {
        return (
            <div className="potion-network-error">
                <h2>⚠️ Error Loading Data</h2>
                <p>{error}</p>
                <button onClick={fetchData}>🔄 Retry</button>
            </div>
        );
    }
    if (loading) {
        return (
            <div className="potion-loading">
                <div className="potion-loading-inner">
                    <div style={{ fontSize: '48px', marginBottom: '20px' }}>🧪</div>
                    <div style={{ fontSize: '24px', marginBottom: '10px', color: '#333', fontWeight: '600' }}>Loading Potion Network...</div>
                    <div style={{ fontSize: '14px', color: '#999' }}>{loadingStatus}</div>
                    <div style={{ marginTop: '20px', width: '200px', height: '4px', background: '#f0f0f0', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'linear-gradient(90deg, #667eea, #764ba2)', animation: 'loading 1.5s infinite', width: '50%' }} />
                    </div>
                </div>
                <style>{`
            @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(300%); }
            }
        `}</style>
            </div>
        );
    }
    if (cauldrons.length === 0) {
        return <div className="potion-network-empty">No cauldron data available</div>;
    }

    const avgLat = cauldrons.reduce((sum, c) => sum + c.latitude, 0) / cauldrons.length;
    const avgLon = cauldrons.reduce((sum, c) => sum + c.longitude, 0) / cauldrons.length;
    const nodePos = {};
    cauldrons.forEach(c => { nodePos[c.id] = [c.latitude, c.longitude]; });
    if (market) { nodePos['market_001'] = [market.latitude, market.longitude]; }

    return (
        <div className="potion-network-container">
            <div className="potion-network-header">
                <h1>🧪 Potion Network</h1>
                <p>📅 {timestamp} • 🔄 Auto-refresh: Every 60s</p>
            </div>
            <MapContainer center={[avgLat, avgLon]} zoom={17} style={{ flex: 1, width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
                {edges.map((edge, idx) => {
                    const fromPos = nodePos[edge.from];
                    const toPos = nodePos[edge.to];
                    if (!fromPos || !toPos) return null;
                    const isToMarket = edge.to.includes('market');
                    const color = isToMarket ? '#c0392b' : '#1a5490';
                    return (
                        <React.Fragment key={idx}>
                            <CurvedArrow positions={[fromPos, toPos]} color={color} />
                            <TravelTimeLabel positions={[fromPos, toPos]} time={edge.travel_time_minutes} color={color} />
                        </React.Fragment>
                    );
                })}
                {cauldrons.map(cauldron => {
                    const volume = currentLevels[cauldron.id] || 0;
                    const fullness = volume / cauldron.max_volume;
                    const markerColor = fullness < 0.5 ? '#2ecc71' : (fullness < 0.9 ? '#f39c12' : '#e74c3c');
                    return (
                        <Marker key={cauldron.id} position={[cauldron.latitude, cauldron.longitude]} icon={createCauldronIcon(markerColor)}>
                            <Popup>
                                <div style={{ fontFamily: 'Segoe UI, sans-serif', minWidth: '180px' }}>
                                    <strong style={{ fontSize: '15px', color: '#333' }}>{cauldron.name}</strong>
                                    <div style={{ marginTop: '8px', fontSize: '13px' }}>
                                        <div style={{ marginBottom: '4px' }}>📊 <strong>{volume.toFixed(1)}</strong> / {cauldron.max_volume} L</div>
                                        <div style={{ background: '#f0f0f0', borderRadius: '10px', height: '8px', overflow: 'hidden', marginTop: '6px' }}>
                                            <div style={{ background: markerColor, width: `${fullness * 100}%`, height: '100%', borderRadius: '10px', transition: 'width 0.3s' }} />
                                        </div>
                                        <div style={{ marginTop: '6px', color: markerColor, fontWeight: 'bold', fontSize: '14px' }}>
                                            {(fullness * 100).toFixed(0)}% Full
                                        </div>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
                {market && (
                    <Marker position={[market.latitude, market.longitude]} icon={marketIcon}>
                        <Popup>
                            <div style={{ fontFamily: 'Segoe UI, sans-serif', textAlign: 'center', padding: '5px' }}>
                                <div style={{ fontSize: '24px', marginBottom: '5px' }}>✨</div>
                                <strong style={{ fontSize: '16px', color: '#8e44ad' }}>{market.name || 'Enchanted Market'}</strong>
                                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Main Distribution Hub</div>
                            </div>
                        </Popup>
                    </Marker>
                )}
            </MapContainer>
        </div>
    );
}

export default PotionNetworkMap;