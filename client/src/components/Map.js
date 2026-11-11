import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import 'leaflet-routing-machine';
import { getLocations } from '../services/api';
import io from 'socket.io-client';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const SOCKET_URL = 'http://localhost:5000';

const getColor = (density) => {
  if (density > 0.7) return '#ff4444';
  if (density > 0.4) return '#ffaa00';
  return '#44bb44';
};

const getDensityLabel = (density) => {
  if (density > 0.7) return '🔴 Crowded';
  if (density > 0.4) return '🟡 Moderate';
  return '🟢 Quiet';
};

const getIcon = (type) => {
  const icons = {
    faculty: '🏛️', admin: '🏢', lecture: '📚',
    sports: '⚽', social: '🍽️', hostel: '🏠',
    lab: '🔬', facility: '📡', health: '🏥'
  };
  return icons[type] || '📍';
};

const getTypeColor = (type) => {
  const colors = {
    faculty: '#2E5596',
    admin: '#1A3A6B',
    lecture: '#8B5CF6',
    sports: '#10B981',
    social: '#F59E0B',
    hostel: '#EC4899',
    lab: '#06B6D4',
    facility: '#6B7280',
    health: '#EF4444',
  };
  return colors[type] || '#1A3A6B';
};

const createCustomIcon = (type, isFrom = false, isTo = false) => {
  const emoji = {
    faculty: '🏛️', admin: '🏢', lecture: '📚',
    sports: '⚽', social: '🍽️', hostel: '🏠',
    lab: '🔬', facility: '📡', health: '🏥'
  }[type] || '📍';

  const bgColor = isFrom ? '#44bb44' : isTo ? '#ff4444' : getTypeColor(type);

  return L.divIcon({
    className: '',
    html: `
      <div style="
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
      ">
        <div style="
          background: ${bgColor};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          width: 36px;
          height: 36px;
          border: 3px solid white;
          box-shadow: 0 3px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <span style="
            transform: rotate(45deg);
            font-size: 16px;
            line-height: 1;
          ">${emoji}</span>
        </div>
        <div style="
          width: 0;
          height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 8px solid ${bgColor};
          margin-top: -2px;
        "></div>
      </div>
    `,
    iconSize: [36, 48],
    iconAnchor: [18, 48],
    popupAnchor: [0, -48],
  });
};

// ── Routing Component ──────────────────────────────────
const RoutingControl = ({ from, to }) => {
  const map = useMap();
  const routingRef = useRef(null);

  useEffect(() => {
    if (!from || !to) return;

    // Safely remove existing route
    if (routingRef.current) {
      try {
        routingRef.current.getPlan().setWaypoints([]);
        map.removeControl(routingRef.current);
      } catch (e) {}
      routingRef.current = null;
    }

    // Small delay to ensure map is ready
    const timer = setTimeout(() => {
      try {
        routingRef.current = L.Routing.control({
          waypoints: [
            L.latLng(parseFloat(from.latitude), parseFloat(from.longitude)),
            L.latLng(parseFloat(to.latitude), parseFloat(to.longitude)),
          ],
          routeWhileDragging: false,
          addWaypoints: false,
          draggableWaypoints: false,
          fitSelectedRoutes: true,
          show: false,
          lineOptions: {
            styles: [{ color: '#1A3A6B', weight: 5, opacity: 0.8 }]
          },
          createMarker: (i, waypoint) => {
            return L.marker(waypoint.latLng, {
              icon: L.divIcon({
                className: '',
                html: `<div style="
                  background: ${i === 0 ? '#44bb44' : '#ff4444'};
                  color: white;
                  border-radius: 50%;
                  width: 30px;
                  height: 30px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-weight: bold;
                  font-size: 14px;
                  border: 2px solid white;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                ">${i === 0 ? 'A' : 'B'}</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15],
              })
            });
          }
        }).addTo(map);
      } catch (e) {
        console.error('Routing error:', e);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (routingRef.current) {
        try {
          routingRef.current.getPlan().setWaypoints([]);
          map.removeControl(routingRef.current);
        } catch (e) {}
        routingRef.current = null;
      }
    };
  }, [from, to, map]);

  return null;
};

// ── Main Map Component ─────────────────────────────────
const Map = () => {
  const [locations, setLocations] = useState([]);
  const [crowdData, setCrowdData] = useState({});
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Routing state
  const [routeFrom, setRouteFrom] = useState(null);
  const [routeTo, setRouteTo] = useState(null);
  const [routeMode, setRouteMode] = useState(false); // true = picking route points

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await getLocations();
        setLocations(res.data);
        const initialDensity = {};
        res.data.forEach((loc) => {
          initialDensity[loc.id] = parseFloat(Math.random().toFixed(2));
        });
        setCrowdData(initialDensity);
        setLastUpdated(new Date());
      } catch (err) {
        console.error('Failed to fetch locations:', err);
      }
    };
    fetchLocations();

    const socket = io(SOCKET_URL);
    socket.on('crowd_update', (data) => {
      if (data && Array.isArray(data.densities)) {
        const densityMap = {};
        data.densities.forEach((d) => {
          densityMap[d.locationId] = d.density;
        });
        setCrowdData(densityMap);
        setLastUpdated(new Date());
      }
    });

    return () => socket.disconnect();
  }, []);

  const filteredLocations = locations.filter((loc) =>
    loc.name.toLowerCase().includes(search.toLowerCase())
  );

  const crowdedCount = Object.values(crowdData).filter(d => d > 0.7).length;
  const moderateCount = Object.values(crowdData).filter(d => d > 0.4 && d <= 0.7).length;
  const quietCount = Object.values(crowdData).filter(d => d <= 0.4).length;

  const handleLocationClick = (loc) => {
    if (!routeMode) {
      setSelected(loc);
      return;
    }
    // In route mode — pick from then to
    if (!routeFrom) {
      setRouteFrom(loc);
    } else if (!routeTo && loc.id !== routeFrom.id) {
      setRouteTo(loc);
      setRouteMode(false);
    }
  };

  const clearRoute = () => {
    setRouteFrom(null);
    setRouteTo(null);
    setRouteMode(false);
  };

  const startRouteMode = () => {
    clearRoute();
    setSelected(null);
    setRouteMode(true);
  };

  return (
    <div style={styles.wrapper}>

      {/* Search Bar */}
      <div style={styles.searchContainer}>
        <input
          style={styles.searchInput}
          type="text"
          placeholder="🔍 Search for a building or facility..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Sidebar */}
      <div style={styles.sidebar}>
        <h3 style={styles.sidebarTitle}>📍 Campus Locations</h3>

        {/* Crowd Summary */}
        <div style={styles.crowdSummary}>
          <p style={styles.summaryTitle}>🔴 Live Crowd Status</p>
          <div style={styles.summaryRow}>
            <span style={{ color: '#ff4444' }}>🔴 {crowdedCount}</span>
            <span style={{ color: '#ffaa00' }}>🟡 {moderateCount}</span>
            <span style={{ color: '#44bb44' }}>🟢 {quietCount}</span>
          </div>
          {lastUpdated && (
            <p style={styles.lastUpdated}>Updated: {lastUpdated.toLocaleTimeString()}</p>
          )}
        </div>

        {/* Heatmap Toggle */}
        <div style={styles.toggleRow}>
          <span style={styles.toggleLabel}>Crowd Overlay</span>
          <button
            style={{ ...styles.toggleBtn, backgroundColor: showHeatmap ? '#1A3A6B' : '#ccc' }}
            onClick={() => setShowHeatmap(!showHeatmap)}
          >
            {showHeatmap ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Route Navigation Panel */}
        <div style={styles.routePanel}>
          <p style={styles.summaryTitle}>🗺️ Route Navigation</p>

          {!routeMode && !routeFrom && (
            <button style={styles.routeBtn} onClick={startRouteMode}>
              Get Directions
            </button>
          )}

          {routeMode && !routeFrom && (
            <div style={styles.routeInstruction}>
              <p style={styles.routeStep}>📍 Click a building to set <strong>Start</strong></p>
              <button style={styles.clearBtn} onClick={clearRoute}>Cancel</button>
            </div>
          )}

          {routeFrom && !routeTo && (
            <div style={styles.routeInstruction}>
              <p style={styles.routePoint}>
                🟢 <strong>From:</strong> {routeFrom.name}
              </p>
              <p style={styles.routeStep}>📍 Click a building to set <strong>Destination</strong></p>
              <button style={styles.clearBtn} onClick={clearRoute}>Cancel</button>
            </div>
          )}

          {routeFrom && routeTo && (
            <div style={styles.routeInstruction}>
              <p style={styles.routePoint}>🟢 <strong>From:</strong> {routeFrom.name}</p>
              <p style={styles.routePoint}>🔴 <strong>To:</strong> {routeTo.name}</p>
              <button style={styles.routeBtn} onClick={startRouteMode}>
                New Route
              </button>
              <button style={{ ...styles.clearBtn, marginTop: '6px' }} onClick={clearRoute}>
                Clear Route
              </button>
            </div>
          )}
        </div>

        {/* Location List */}
        {filteredLocations.map((loc) => {
          const density = crowdData[loc.id];
          const isFrom = routeFrom?.id === loc.id;
          const isTo = routeTo?.id === loc.id;

          return (
            <div
              key={loc.id}
              style={{
                ...styles.locationCard,
                borderLeft: `4px solid ${isFrom ? '#44bb44' : isTo ? '#ff4444' : density ? getColor(density) : '#1A3A6B'}`,
                backgroundColor: isFrom ? '#f0fff4' : isTo ? '#fff0f0' : selected?.id === loc.id ? '#f0f4ff' : '#fff'
              }}
              onClick={() => handleLocationClick(loc)}
            >
              <p style={styles.locationName}>
                {isFrom ? '🟢 ' : isTo ? '🔴 ' : ''}{getIcon(loc.type)} {loc.name}
              </p>
              <p style={styles.locationType}>{loc.type}</p>
              {density !== undefined && (
                <>
                  <div style={styles.densityBar}>
                    <div style={{
                      ...styles.densityFill,
                      width: `${density * 100}%`,
                      backgroundColor: getColor(density)
                    }} />
                  </div>
                  <p style={{ ...styles.densityLabel, color: getColor(density) }}>
                    {getDensityLabel(density)} ({Math.round(density * 100)}%)
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Map */}
      <div style={styles.mapContainer}>
        <MapContainer
          center={[6.00805, 10.21710]}
          zoom={18}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Route */}
          {routeFrom && routeTo && (
            <RoutingControl from={routeFrom} to={routeTo} onClear={clearRoute} />
          )}

          {filteredLocations.map((loc) => {
            const density = crowdData[loc.id];
            return (
              <React.Fragment key={loc.id}>
                <Marker
  position={[parseFloat(loc.latitude), parseFloat(loc.longitude)]}
  icon={createCustomIcon(loc.type, routeFrom?.id === loc.id, routeTo?.id === loc.id)}
  eventHandlers={{ click: () => handleLocationClick(loc) }}
>
                  <Popup>
                    <div style={styles.popup}>
                      <strong>{getIcon(loc.type)} {loc.name}</strong>
                      <p>Type: {loc.type}</p>
                      <p>Capacity: {loc.capacity}</p>
                      <p>{loc.description}</p>
                      {density !== undefined && (
                        <p style={{ color: getColor(density), fontWeight: 'bold' }}>
                          {getDensityLabel(density)} ({Math.round(density * 100)}%)
                        </p>
                      )}
                      {routeMode && !routeFrom && (
                        <button style={styles.popupBtn} onClick={() => handleLocationClick(loc)}>
                          Set as Start
                        </button>
                      )}
                      {routeMode && routeFrom && !routeTo && (
                        <button style={styles.popupBtn} onClick={() => handleLocationClick(loc)}>
                          Set as Destination
                        </button>
                      )}
                    </div>
                  </Popup>
                </Marker>

                {showHeatmap && density !== undefined && (
                  <Circle
                    center={[parseFloat(loc.latitude), parseFloat(loc.longitude)]}
                    radius={density * 25}
                    pathOptions={{
                      color: getColor(density),
                      fillColor: getColor(density),
                      fillOpacity: 0.35,
                      weight: 2
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </MapContainer>
      </div>

      {/* Route mode banner */}
      {routeMode && (
        <div style={styles.routeBanner}>
          {!routeFrom
            ? '📍 Click any building on the map or sidebar to set your START point'
            : '📍 Now click your DESTINATION building'}
        </div>
      )}

      {/* Selected detail panel */}
      {selected && !routeMode && (
        <div style={styles.detailPanel}>
          <button style={styles.closeBtn} onClick={() => setSelected(null)}>✕</button>
          <h3 style={styles.detailTitle}>{getIcon(selected.type)} {selected.name}</h3>
          <p><strong>Type:</strong> {selected.type}</p>
          <p><strong>Capacity:</strong> {selected.capacity} people</p>
          <p><strong>Description:</strong> {selected.description}</p>
          {crowdData[selected.id] !== undefined && (
            <>
              <div style={{ ...styles.densityBar, height: '10px', margin: '8px 0' }}>
                <div style={{
                  ...styles.densityFill,
                  width: `${crowdData[selected.id] * 100}%`,
                  backgroundColor: getColor(crowdData[selected.id])
                }} />
              </div>
              <p style={{ color: getColor(crowdData[selected.id]), fontWeight: 'bold' }}>
                {getDensityLabel(crowdData[selected.id])} ({Math.round(crowdData[selected.id] * 100)}%)
              </p>
            </>
          )}
          <button style={{ ...styles.routeBtn, marginTop: '10px', width: '100%' }}
            onClick={() => { setRouteFrom(selected); setSelected(null); setRouteMode(true); }}>
            🗺️ Navigate Here
          </button>
        </div>
      )}

    </div>
  );
};

const styles = {
  wrapper: { display: 'flex', height: 'calc(100vh - 50px)', position: 'relative', overflow: 'hidden' },
  searchContainer: { position: 'absolute', top: '15px', left: '320px', right: '15px', zIndex: 1000 },
  searchInput: { width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #ddd',
    fontSize: '14px', boxShadow: '0 2px 10px rgba(0,0,0,0.15)', boxSizing: 'border-box' },
  sidebar: { width: '300px', backgroundColor: '#f8fafc', borderRight: '1px solid #e0e0e0',
    overflowY: 'auto', padding: '15px', zIndex: 500 },
  sidebarTitle: { color: '#1A3A6B', marginBottom: '10px', fontSize: '16px' },
  crowdSummary: { backgroundColor: '#fff', borderRadius: '8px', padding: '10px',
    marginBottom: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  summaryTitle: { fontWeight: 'bold', color: '#1A3A6B', margin: '0 0 6px 0', fontSize: '13px' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' },
  lastUpdated: { color: '#aaa', fontSize: '10px', margin: '4px 0 0 0' },
  toggleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: '8px', padding: '8px 12px',
    marginBottom: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  toggleLabel: { fontSize: '13px', color: '#333' },
  toggleBtn: { color: '#fff', border: 'none', borderRadius: '6px',
    padding: '4px 12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' },
  routePanel: { backgroundColor: '#fff', borderRadius: '8px', padding: '10px',
    marginBottom: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  routeInstruction: { marginTop: '6px' },
  routeStep: { fontSize: '12px', color: '#555', margin: '4px 0' },
  routePoint: { fontSize: '12px', color: '#333', margin: '4px 0' },
  routeBtn: { width: '100%', padding: '8px', backgroundColor: '#1A3A6B', color: '#fff',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' },
  clearBtn: { width: '100%', padding: '6px', backgroundColor: '#f0f0f0', color: '#555',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
  noResults: { color: '#888', fontSize: '14px' },
  locationCard: { backgroundColor: '#fff', borderRadius: '8px', padding: '10px',
    marginBottom: '8px', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  locationName: { fontWeight: 'bold', color: '#1A3A6B', margin: '0 0 2px 0', fontSize: '13px' },
  locationType: { color: '#888', margin: '0 0 6px 0', fontSize: '11px', textTransform: 'capitalize' },
  densityBar: { height: '6px', backgroundColor: '#f0f0f0', borderRadius: '3px',
    overflow: 'hidden', marginBottom: '3px' },
  densityFill: { height: '100%', borderRadius: '3px', transition: 'width 0.5s ease' },
  densityLabel: { margin: 0, fontSize: '11px', fontWeight: 'bold' },
  mapContainer: { flex: 1, position: 'relative' },
  popup: { minWidth: '160px' },
  popupBtn: { marginTop: '6px', padding: '4px 10px', backgroundColor: '#1A3A6B',
    color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  routeBanner: { position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
    backgroundColor: '#1A3A6B', color: '#fff', padding: '10px 24px', borderRadius: '24px',
    fontSize: '13px', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', whiteSpace: 'nowrap' },
  detailPanel: { position: 'absolute', bottom: '20px', right: '20px', backgroundColor: '#fff',
    padding: '20px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    zIndex: 1000, maxWidth: '280px', fontSize: '14px' },
  detailTitle: { color: '#1A3A6B', marginTop: 0, fontSize: '16px' },
  closeBtn: { position: 'absolute', top: '10px', right: '10px', background: 'none',
    border: 'none', fontSize: '16px', cursor: 'pointer', color: '#888' },
};

export default Map;