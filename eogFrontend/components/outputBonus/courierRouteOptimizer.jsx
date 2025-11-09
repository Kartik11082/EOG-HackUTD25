import React, { useState, useEffect } from 'react';

const CourierRouteOptimizer = () => {
  const [metadata, setMetadata] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [marketInfo, setMarketInfo] = useState(null);
  const [couriers, setCouriers] = useState([]);
  const [cauldrons, setCauldrons] = useState([]);
  const [tickets, setTickets] = useState({ transport_tickets: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [optimizationResult, setOptimizationResult] = useState(null);
  const [debugInfo, setDebugInfo] = useState([]);

  const UNLOAD_TIME_MINUTES = 15;

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #1e1b4b, #581c87, #1e293b)',
      padding: '24px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    maxWidth: {
      maxWidth: '1280px',
      margin: '0 auto'
    },
    header: {
      textAlign: 'center',
      marginBottom: '32px'
    },
    headerFlex: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      marginBottom: '16px',
      flexWrap: 'wrap'
    },
    title: {
      fontSize: '48px',
      fontWeight: 'bold',
      background: 'linear-gradient(to right, #c084fc, #f9a8d4, #a5b4fc)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      margin: 0
    },
    subtitle: {
      color: '#d8b4fe',
      fontSize: '18px',
      marginTop: '8px'
    },
    card: {
      background: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(20px)',
      borderRadius: '16px',
      border: '1px solid rgba(168, 85, 247, 0.3)',
      padding: '24px',
      marginBottom: '24px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
    },
    errorCard: {
      background: 'rgba(127, 29, 29, 0.4)',
      border: '2px solid #ef4444',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '24px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    input: {
      padding: '8px 16px',
      borderRadius: '8px',
      background: '#1e293b',
      color: 'white',
      border: '1px solid rgba(168, 85, 247, 0.5)',
      outline: 'none',
      fontSize: '14px'
    },
    button: {
      padding: '8px 24px',
      background: 'linear-gradient(to right, #9333ea, #db2777)',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '14px',
      boxShadow: '0 0 20px rgba(168, 85, 247, 0.5)',
      transition: 'transform 0.2s'
    },
    buttonSecondary: {
      padding: '8px 16px',
      background: '#334155',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'background 0.2s'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    },
    metricCard: (gradient) => ({
      background: gradient,
      backdropFilter: 'blur(20px)',
      borderRadius: '16px',
      border: '1px solid rgba(168, 85, 247, 0.3)',
      padding: '24px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
      transition: 'transform 0.2s',
      cursor: 'pointer'
    }),
    sectionTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '16px',
      color: 'white',
      fontSize: '24px',
      fontWeight: 'bold'
    },
    loadingContainer: {
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #1e1b4b, #581c87, #1e293b)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center'
    }
  };

  const addDebug = (message, data = null) => {
    console.log(message, data);
    setDebugInfo(prev => [...prev, { message, data, time: new Date().toISOString() }]);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      addDebug('Starting data fetch...');

      const endpoints = [
        { url: '/api/Data/metadata', setter: setMetadata, name: 'Metadata' },
        { url: '/api/Information/network', setter: setNetworkInfo, name: 'Network' },
        { url: '/api/Information/market', setter: setMarketInfo, name: 'Market' },
        { url: '/api/Information/couriers', setter: setCouriers, name: 'Couriers' },
        { url: '/api/Information/cauldrons', setter: setCauldrons, name: 'Cauldrons' },
        { url: '/api/Tickets', setter: setTickets, name: 'Tickets' }
      ];

      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint.url);
          if (!res.ok) throw new Error(`${endpoint.name} API returned ${res.status}`);
          const data = await res.json();
          const processedData = Array.isArray(data) ? data : (data || {});
          endpoint.setter(processedData);
          addDebug(`${endpoint.name} loaded`, processedData);
        } catch (err) {
          addDebug(`${endpoint.name} fetch failed`, err.message);
        }
      }

      setLoading(false);
      addDebug('All data fetch complete');
    } catch (err) {
      setError(err.message);
      setLoading(false);
      addDebug('Fatal error', err.message);
    }
  };

  const fetchHistoricalData = async () => {
    if (!selectedDate) {
      alert('Please select a date');
      return;
    }

    try {
      const timestamp = Math.floor(new Date(selectedDate).getTime() / 1000);
      
      addDebug('Fetching historical data', { timestamp });
      
      const res = await fetch(`/api/Data?start_date=${timestamp}&end_date=${timestamp}`);
      if (!res.ok) throw new Error(`Historical data API returned ${res.status}`);
      
      const data = await res.json();
      addDebug('Historical data loaded', data);
      
      let dataArray = [];
      if (Array.isArray(data) && data.length > 0) {
        const latestDataPoint = data[0];
        if (latestDataPoint.cauldron_levels) {
          Object.entries(latestDataPoint.cauldron_levels).forEach(([cauldronId, level]) => {
            dataArray.push({
              cauldron_id: cauldronId,
              level: level,
              timestamp: latestDataPoint.timestamp
            });
          });
        }
      } else if (data && data.cauldron_levels) {
        Object.entries(data.cauldron_levels).forEach(([cauldronId, level]) => {
          dataArray.push({
            cauldron_id: cauldronId,
            level: level,
            timestamp: data.timestamp
          });
        });
      }
      
      setHistoricalData(dataArray);
      addDebug('Processed historical data', dataArray);
      
      optimizeRoutes(dataArray);
    } catch (err) {
      setError(err.message);
      addDebug('Historical data fetch failed', err.message);
    }
  };

  const optimizeRoutes = (data) => {
    if (!couriers.length || !cauldrons.length) {
      addDebug('Cannot optimize: missing couriers or cauldrons', { couriers: couriers.length, cauldrons: cauldrons.length });
      return;
    }

    addDebug('Starting optimization', { couriers: couriers.length, cauldrons: cauldrons.length, dataPoints: data.length });

    const totalCauldrons = cauldrons.length;
    const avgCourierCapacity = couriers.reduce((sum, c) => sum + (c.max_carrying_capacity || 0), 0) / couriers.length;
    const minWitches = Math.max(1, Math.ceil(totalCauldrons * 1.2 / Math.max(1, avgCourierCapacity)));

    addDebug('Calculated min witches', { totalCauldrons, avgCourierCapacity, minWitches });

    const predictions = predictFillLevels(data);
    const routes = generateRoutes(predictions);

    const result = {
      minWitches,
      predictions,
      routes,
      efficiency: calculateEfficiency(routes),
      totalUnloadTime: routes.length * UNLOAD_TIME_MINUTES
    };

    setOptimizationResult(result);
    addDebug('Optimization complete', result);
  };

  const predictFillLevels = (data) => {
    return cauldrons.map(cauldron => {
      const cauldronData = data.find(d => d.cauldron_id === cauldron.id);
      
      let currentLevel = 0;
      let predictedLevel = 0;
      let fillRate = 0;
      
      if (cauldronData) {
        // Use the actual level from the selected date
        currentLevel = cauldronData.level || 0;
        // Simple prediction: assume 50% increase in next 24 hours
        fillRate = currentLevel * 0.02; // Approximate fill rate per hour
        predictedLevel = Math.min(cauldron.max_volume || 100, Math.max(0, currentLevel + fillRate * 24));
      } else {
        // No data available for this cauldron on selected date
        currentLevel = 0;
        predictedLevel = 0;
      }
      
      const maxVolume = cauldron.max_volume || 100;
      const fillPercentage = currentLevel / maxVolume;
      const riskOfOverflow = fillPercentage > 0.85;
      
      return {
        cauldronId: cauldron.id,
        name: cauldron.name,
        latitude: cauldron.latitude,
        longitude: cauldron.longitude,
        currentLevel,
        predictedLevel,
        maxVolume,
        fillRate,
        fillPercentage,
        riskOfOverflow
      };
    });
  };

  const generateRoutes = (predictions) => {
    if (!predictions.length || !couriers.length) {
      addDebug('Cannot generate routes', { predictions: predictions.length, couriers: couriers.length });
      return [];
    }

    const routes = [];
    
    const highPriority = predictions.filter(p => p.riskOfOverflow || p.fillPercentage > 0.8);
    const mediumPriority = predictions.filter(p => !p.riskOfOverflow && p.fillPercentage > 0.5 && p.fillPercentage <= 0.8);
    const lowPriority = predictions.filter(p => p.fillPercentage <= 0.5 && p.predictedLevel > 0);
    
    addDebug('Route generation priorities', { 
      high: highPriority.length, 
      medium: mediumPriority.length,
      low: lowPriority.length,
      totalCouriers: couriers.length 
    });

    const allCauldrons = [...highPriority, ...mediumPriority, ...lowPriority];
    let cauldronIndex = 0;

    couriers.forEach((courier, idx) => {
      const route = {
        courierId: courier.courier_id || `courier_${idx}`,
        courierName: courier.name || `Courier ${idx + 1}`,
        stops: [],
        totalDistance: 0,
        totalVolume: 0,
        totalTravelTime: 0
      };

      let capacity = courier.max_carrying_capacity || 50;
      
      addDebug(`Building route for ${route.courierName}`, { capacity, startingCauldronIndex: cauldronIndex });

      while (capacity > 0 && cauldronIndex < allCauldrons.length) {
        const pred = allCauldrons[cauldronIndex];
        
        if (pred.predictedLevel > 0) {
          const pickupVolume = Math.min(capacity, pred.predictedLevel);
          
          const travelTime = networkInfo?.edges?.find(e => 
            (e.from === pred.cauldronId || e.to === pred.cauldronId)
          )?.travel_time_minutes || 10;
          
          route.stops.push({
            cauldronId: pred.cauldronId,
            name: pred.name,
            pickupVolume,
            currentLevel: pred.currentLevel,
            predictedLevel: pred.predictedLevel,
            fillPercentage: pred.fillPercentage,
            priority: pred.riskOfOverflow ? 'HIGH' : (pred.fillPercentage > 0.5 ? 'MEDIUM' : 'LOW'),
            travelTime
          });
          
          capacity -= pickupVolume;
          route.totalVolume += pickupVolume;
          route.totalTravelTime += travelTime;
        }
        
        cauldronIndex++;
      }

      if (route.totalVolume > 0) {
        route.stops.push({
          location: marketInfo?.name || 'Enchanted Market',
          deliveryVolume: route.totalVolume,
          type: 'DELIVERY',
          unloadTime: UNLOAD_TIME_MINUTES
        });
        
        route.totalTravelTime += UNLOAD_TIME_MINUTES;
        routes.push(route);
        addDebug(`Route ${idx + 1} complete`, { stops: route.stops.length, volume: route.totalVolume });
      }
    });

    addDebug('All routes generated', { totalRoutes: routes.length });
    return routes;
  };

  const calculateEfficiency = (routes) => {
    if (!routes.length) {
      addDebug('No routes to calculate efficiency for');
      return { avgStopsPerRoute: '0', utilizationRate: '0', totalRoutes: 0 };
    }

    const totalStops = routes.reduce((sum, r) => sum + r.stops.length, 0);
    const avgStopsPerRoute = totalStops / routes.length;
    
    const utilizationRate = routes.reduce((sum, r) => {
      const courier = couriers.find(c => c.courier_id === r.courierId);
      const maxCapacity = courier?.max_carrying_capacity || 50;
      return sum + (r.totalVolume / maxCapacity);
    }, 0) / routes.length;

    const result = {
      avgStopsPerRoute: avgStopsPerRoute.toFixed(1),
      utilizationRate: (utilizationRate * 100).toFixed(1),
      totalRoutes: routes.length
    };

    addDebug('Efficiency calculated', result);
    return result;
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔮</div>
          <div style={{ color: 'white', fontSize: '24px', fontWeight: '600' }}>Loading Potion Factory Data...</div>
          <div style={{ color: '#d8b4fe', marginTop: '8px' }}>Gathering cauldron intelligence</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.maxWidth}>
        <div style={styles.header}>
          <div style={styles.headerFlex}>
            <div style={{ fontSize: '64px' }}>🧙‍♀️</div>
            <div>
              <h1 style={styles.title}>Potion Flow Monitor</h1>
              <p style={styles.subtitle}>Optimized Courier Routes & Overflow Prevention</p>
            </div>
            <div style={{ fontSize: '64px' }}>🍯</div>
          </div>
        </div>

        {error && (
          <div style={styles.errorCard}>
            <span style={{ fontSize: '32px' }}>⚠️</span>
            <div>
              <div style={{ color: '#fecaca', fontWeight: '600' }}>Error Detected</div>
              <div style={{ color: '#fca5a5', fontSize: '14px' }}>{error}</div>
            </div>
          </div>
        )}

        <div style={styles.card}>
          <div style={styles.sectionTitle}>
            <span style={{ fontSize: '32px' }}>📅</span>
            <span>Historical Data Analysis</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ color: '#d8b4fe', fontWeight: '500' }}>Select Date & Time:</label>
              <input
                type="datetime-local"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={styles.input}
              />
            </div>
            <button
              onClick={fetchHistoricalData}
              style={styles.button}
              onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
              onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
            >
              ✨ Analyze & Optimize
            </button>
          </div>
        </div>

        <div style={styles.grid}>
          <div 
            style={styles.metricCard('linear-gradient(to bottom right, rgba(88, 28, 135, 0.6), rgba(91, 33, 182, 0.4))')}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '48px' }}>🧙‍♀️</div>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'white' }}>{couriers.length}</div>
            </div>
            <div style={{ color: '#ddd6fe', fontWeight: '600' }}>Active Couriers</div>
            <div style={{ color: '#c4b5fd', fontSize: '14px', marginTop: '4px' }}>Ready for dispatch</div>
          </div>
          
          <div 
            style={styles.metricCard('linear-gradient(to bottom right, rgba(131, 24, 67, 0.6), rgba(157, 23, 77, 0.4))')}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '48px' }}>🍯</div>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'white' }}>{cauldrons.length}</div>
            </div>
            <div style={{ color: '#fbcfe8', fontWeight: '600' }}>Brewing Cauldrons</div>
            <div style={{ color: '#f9a8d4', fontSize: '14px', marginTop: '4px' }}>Monitored locations</div>
          </div>
          
          <div 
            style={styles.metricCard('linear-gradient(to bottom right, rgba(49, 46, 129, 0.6), rgba(55, 48, 163, 0.4))')}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '48px' }}>🗺️</div>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'white' }}>{networkInfo?.edges?.length || 0}</div>
            </div>
            <div style={{ color: '#c7d2fe', fontWeight: '600' }}>Network Routes</div>
            <div style={{ color: '#a5b4fc', fontSize: '14px', marginTop: '4px' }}>Broomstick paths</div>
          </div>
          
          <div 
            style={styles.metricCard('linear-gradient(to bottom right, rgba(6, 78, 59, 0.6), rgba(4, 120, 87, 0.4))')}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '48px' }}>📋</div>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'white' }}>{tickets.transport_tickets?.length || 0}</div>
            </div>
            <div style={{ color: '#a7f3d0', fontWeight: '600' }}>Transport Tickets</div>
            <div style={{ color: '#6ee7b7', fontSize: '14px', marginTop: '4px' }}>Logged deliveries</div>
          </div>
        </div>

        {optimizationResult && (
          <div>
            <div style={styles.card}>
              <div style={styles.sectionTitle}>
                <span style={{ fontSize: '32px' }}>📊</span>
                <span>Optimization Summary</span>
              </div>
              <div style={styles.grid}>
                <div style={{ background: 'linear-gradient(to bottom right, rgba(147, 51, 234, 0.4), rgba(126, 34, 206, 0.3))', borderRadius: '12px', padding: '20px', border: '1px solid rgba(196, 181, 253, 0.3)' }}>
                  <div style={{ color: '#ddd6fe', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Minimum Witches</div>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>{optimizationResult.minWitches}</div>
                  <div style={{ color: '#c4b5fd', fontSize: '12px' }}>Required for operation</div>
                </div>
                <div style={{ background: 'linear-gradient(to bottom right, rgba(37, 99, 235, 0.4), rgba(29, 78, 216, 0.3))', borderRadius: '12px', padding: '20px', border: '1px solid rgba(147, 197, 253, 0.3)' }}>
                  <div style={{ color: '#bfdbfe', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Avg Stops Per Route</div>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>{optimizationResult.efficiency.avgStopsPerRoute}</div>
                  <div style={{ color: '#93c5fd', fontSize: '12px' }}>Collection points</div>
                </div>
                <div style={{ background: 'linear-gradient(to bottom right, rgba(22, 163, 74, 0.4), rgba(21, 128, 61, 0.3))', borderRadius: '12px', padding: '20px', border: '1px solid rgba(134, 239, 172, 0.3)' }}>
                  <div style={{ color: '#bbf7d0', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Capacity Utilization</div>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>{optimizationResult.efficiency.utilizationRate}%</div>
                  <div style={{ color: '#86efac', fontSize: '12px' }}>Efficiency rate</div>
                </div>
                <div style={{ background: 'linear-gradient(to bottom right, rgba(217, 119, 6, 0.4), rgba(180, 83, 9, 0.3))', borderRadius: '12px', padding: '20px', border: '1px solid rgba(253, 186, 116, 0.3)' }}>
                  <div style={{ color: '#fde68a', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Total Unload Time</div>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>{optimizationResult.totalUnloadTime}</div>
                  <div style={{ color: '#fcd34d', fontSize: '12px' }}>Minutes at market</div>
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.sectionTitle}>
                <span style={{ fontSize: '32px' }}>🔮</span>
                <span>Cauldron Fill Predictions</span>
              </div>
              <div style={styles.grid}>
                {optimizationResult.predictions.map((pred, idx) => {
                  const cardBg = pred.riskOfOverflow 
                    ? 'linear-gradient(to bottom right, rgba(127, 29, 29, 0.6), rgba(153, 27, 27, 0.4))'
                    : pred.fillPercentage > 0.5
                    ? 'linear-gradient(to bottom right, rgba(113, 63, 18, 0.6), rgba(133, 77, 14, 0.4))'
                    : 'linear-gradient(to bottom right, rgba(30, 41, 59, 0.6), rgba(51, 65, 85, 0.4))';
                  
                  const borderColor = pred.riskOfOverflow 
                    ? 'rgba(248, 113, 113, 0.5)'
                    : pred.fillPercentage > 0.5
                    ? 'rgba(251, 191, 36, 0.5)'
                    : 'rgba(100, 116, 139, 0.5)';

                  const progressBg = pred.riskOfOverflow 
                    ? 'linear-gradient(to right, #dc2626, #ef4444)'
                    : pred.fillPercentage > 0.5
                    ? 'linear-gradient(to right, #ca8a04, #eab308)'
                    : 'linear-gradient(to right, #16a34a, #22c55e)';

                  return (
                    <div
                      key={idx}
                      style={{
                        background: cardBg,
                        borderRadius: '12px',
                        padding: '20px',
                        border: `2px solid ${borderColor}`,
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                        transition: 'transform 0.2s',
                        cursor: 'pointer'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ fontWeight: 'bold', color: 'white', fontSize: '18px' }}>{pred.name}</div>
                        {pred.riskOfOverflow && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#dc2626', padding: '4px 8px', borderRadius: '9999px' }}>
                            <span style={{ fontSize: '20px' }}>⚠️</span>
                            <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>RISK</span>
                          </div>
                        )}
                      </div>
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                          <span style={{ color: '#d1d5db' }}>Current:</span>
                          <span style={{ color: 'white', fontFamily: 'monospace', fontWeight: '600' }}>{pred.currentLevel.toFixed(1)}L</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                          <span style={{ color: '#d1d5db' }}>Predicted:</span>
                          <span style={{ color: 'white', fontFamily: 'monospace', fontWeight: '600' }}>{pred.predictedLevel.toFixed(1)}L</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                          <span style={{ color: '#d1d5db' }}>Max Volume:</span>
                          <span style={{ color: 'white', fontFamily: 'monospace', fontWeight: '600' }}>{pred.maxVolume.toFixed(0)}L</span>
                        </div>
                        {pred.fillRate !== 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                            <span style={{ color: '#d1d5db' }}>Fill Rate:</span>
                            <span style={{ color: 'white', fontFamily: 'monospace', fontWeight: '600' }}>{pred.fillRate.toFixed(2)}L/hr</span>
                          </div>
                        )}
                      </div>
                      <div style={{ width: '100%', background: 'rgba(51, 65, 85, 0.5)', borderRadius: '9999px', height: '12px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '12px',
                            borderRadius: '9999px',
                            background: progressBg,
                            width: `${Math.min(100, pred.fillPercentage * 100)}%`,
                            transition: 'width 0.5s'
                          }}
                        />
                      </div>
                      <div style={{ textAlign: 'center', color: 'white', fontWeight: 'bold', fontSize: '14px', marginTop: '8px' }}>
                        {(pred.fillPercentage * 100).toFixed(1)}% Full
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.sectionTitle}>
                <span style={{ fontSize: '32px' }}>🧹</span>
                <span>Optimized Courier Routes</span>
              </div>
              {optimizationResult.routes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '12px', border: '1px solid rgba(71, 85, 105, 0.3)' }}>
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>🤷‍♀️</div>
                  <div style={{ color: '#ddd6fe', fontSize: '20px', fontWeight: '600' }}>No routes generated</div>
                  <div style={{ color: '#c4b5fd', fontSize: '14px', marginTop: '8px' }}>Try fetching historical data first</div>
                </div>
              ) : (
                <div>
                  {optimizationResult.routes.map((route, idx) => (
                    <div 
                      key={idx} 
                      style={{
                        background: 'linear-gradient(to right, rgba(30, 41, 59, 0.8), rgba(51, 65, 85, 0.6))',
                        borderRadius: '12px',
                        padding: '20px',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                        marginBottom: '16px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
                        <div>
                          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '32px' }}>🧙‍♀️</span>
                            Route {idx + 1}: {route.courierName}
                          </div>
                          <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: '#ddd6fe', marginTop: '8px', flexWrap: 'wrap' }}>
                            <span>📦 Volume: {route.totalVolume.toFixed(1)}L</span>
                            <span>⏱️ Travel Time: {route.totalTravelTime} min</span>
                            <span>📍 Stops: {route.stops.length}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', background: 'rgba(147, 51, 234, 0.3)', borderRadius: '8px', padding: '12px 16px' }}>
                          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>{route.stops.length}</div>
                          <div style={{ fontSize: '14px', color: '#ddd6fe' }}>Total Stops</div>
                        </div>
                      </div>
                      <div>
                        {route.stops.map((stop, stopIdx) => {
                          const stopBg = stop.type === 'DELIVERY'
                            ? 'linear-gradient(to right, rgba(6, 78, 59, 0.5), rgba(4, 120, 87, 0.4))'
                            : stop.priority === 'HIGH'
                            ? 'linear-gradient(to right, rgba(127, 29, 29, 0.5), rgba(153, 27, 27, 0.4))'
                            : stop.priority === 'MEDIUM'
                            ? 'linear-gradient(to right, rgba(113, 63, 18, 0.5), rgba(133, 77, 14, 0.4))'
                            : 'linear-gradient(to right, rgba(51, 65, 85, 0.5), rgba(71, 85, 105, 0.4))';

                          const stopBorder = stop.type === 'DELIVERY'
                            ? '2px solid rgba(74, 222, 128, 0.5)'
                            : stop.priority === 'HIGH'
                            ? '2px solid rgba(248, 113, 113, 0.5)'
                            : stop.priority === 'MEDIUM'
                            ? '2px solid rgba(251, 191, 36, 0.5)'
                            : '2px solid rgba(148, 163, 184, 0.5)';

                          const badgeBg = stop.type === 'DELIVERY' 
                            ? '#16a34a'
                            : stop.priority === 'HIGH'
                            ? '#dc2626'
                            : stop.priority === 'MEDIUM'
                            ? '#ca8a04'
                            : '#9333ea';

                          return (
                            <div
                              key={stopIdx}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: stopBg,
                                border: stopBorder,
                                borderRadius: '8px',
                                padding: '16px',
                                marginBottom: '12px',
                                transition: 'transform 0.2s',
                                cursor: 'pointer',
                                flexWrap: 'wrap',
                                gap: '16px'
                              }}
                              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{
                                  borderRadius: '50%',
                                  width: '40px',
                                  height: '40px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 'bold',
                                  fontSize: '18px',
                                  background: badgeBg,
                                  color: 'white',
                                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
                                }}>
                                  {stopIdx + 1}
                                </div>
                                <div>
                                  <div style={{ color: 'white', fontWeight: 'bold', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {stop.type === 'DELIVERY' ? '🏪' : '🍯'} {stop.name || stop.location}
                                  </div>
                                  <div style={{ display: 'flex', gap: '12px', fontSize: '14px', marginTop: '4px', flexWrap: 'wrap' }}>
                                    {stop.type !== 'DELIVERY' ? (
                                      <>
                                        <span style={{ color: '#d1d5db' }}>
                                          Current: <span style={{ color: 'white', fontFamily: 'monospace' }}>{stop.currentLevel?.toFixed(1)}L</span>
                                        </span>
                                        <span style={{ color: '#d1d5db' }}>
                                          Predicted: <span style={{ color: 'white', fontFamily: 'monospace' }}>{stop.predictedLevel?.toFixed(1)}L</span>
                                        </span>
                                        <span style={{ color: '#d1d5db' }}>
                                          Fill: <span style={{ color: 'white', fontFamily: 'monospace' }}>{(stop.fillPercentage * 100).toFixed(0)}%</span>
                                        </span>
                                      </>
                                    ) : (
                                      <span style={{ color: '#d1d5db' }}>
                                        ⏱️ Unload Time: <span style={{ color: 'white', fontFamily: 'monospace' }}>{stop.unloadTime} min</span>
                                      </span>
                                    )}
                                  </div>
                                  {stop.priority && (
                                    <div style={{ marginTop: '8px' }}>
                                      <span style={{
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        padding: '4px 12px',
                                        borderRadius: '9999px',
                                        background: stop.priority === 'HIGH' 
                                          ? '#dc2626'
                                          : stop.priority === 'MEDIUM'
                                          ? '#ca8a04'
                                          : '#2563eb',
                                        color: 'white'
                                      }}>
                                        {stop.priority} PRIORITY
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{
                                  fontSize: '24px',
                                  fontWeight: 'bold',
                                  fontFamily: 'monospace',
                                  color: stop.type === 'DELIVERY' ? '#86efac' : 'white'
                                }}>
                                  {stop.pickupVolume 
                                    ? `↑ ${stop.pickupVolume.toFixed(1)}L` 
                                    : `↓ ${stop.deliveryVolume.toFixed(1)}L`}
                                </div>
                                {stop.travelTime && (
                                  <div style={{ color: '#d1d5db', fontSize: '14px', marginTop: '4px' }}>
                                    🧹 {stop.travelTime} min travel
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{
              background: 'linear-gradient(to right, rgba(120, 53, 15, 0.6), rgba(154, 52, 18, 0.6))',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
            }}>
              <div style={styles.sectionTitle}>
                <span style={{ fontSize: '32px' }}>💡</span>
                <span>Things to Keep in Mind</span>
              </div>
              <div>
                <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: '8px', padding: '16px', border: '1px solid rgba(251, 191, 36, 0.2)', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ fontSize: '24px' }}>⚗️</span>
                    <div>
                      <div style={{ color: '#fde68a', fontWeight: '600', marginBottom: '4px' }}>Per-Cauldron Fill Rates</div>
                      <div style={{ color: '#fef3c7', fontSize: '14px' }}>
                        Each cauldron has its own unique fill rate and drain rate, which can differ significantly between cauldrons. 
                        These rates determine how quickly potion accumulates and how quickly it can be collected.
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: '8px', padding: '16px', border: '1px solid rgba(251, 191, 36, 0.2)', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ fontSize: '24px' }}>💧</span>
                    <div>
                      <div style={{ color: '#fde68a', fontWeight: '600', marginBottom: '4px' }}>Continuous Potion Flow</div>
                      <div style={{ color: '#fef3c7', fontSize: '14px' }}>
                        While potion is being drained from a cauldron, more potion continues to accumulate into the tank at the cauldron's fill rate. 
                        The total drain volumes should reflect this continuous brewing process.
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: '8px', padding: '16px', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ fontSize: '24px' }}>⏰</span>
                    <div>
                      <div style={{ color: '#fde68a', fontWeight: '600', marginBottom: '4px' }}>Market Unload Time</div>
                      <div style={{ color: '#fef3c7', fontSize: '14px' }}>
                        Witches take {UNLOAD_TIME_MINUTES} minutes to unload each time they arrive at the Enchanted Market. 
                        This must be accounted for when scheduling trips and preventing overflow.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(20px)',
            borderRadius: '12px',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            padding: '12px 24px'
          }}>
            <div style={{ color: '#c4b5fd', fontSize: '14px' }}>
              🔮 <span style={{ fontWeight: '600' }}>Poyo's Potion Factory</span> - Deep within the brewing halls, cauldrons bubble away... 
              <span style={{ color: '#a78bfa' }}> ⚗️✨</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourierRouteOptimizer;