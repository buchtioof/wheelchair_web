import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Icones personnalisées Leaflet
const sensorIcon = L.divIcon({
  className: 'custom-icon-sensor',
  html: `<div style="
    background-color: #e74c3c;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const fenceCenterIcon = L.divIcon({
  className: 'custom-icon-fence',
  html: `<div style="
    background-color: #2980b9;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 3px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

// Gestion des clics sur la carte pour déplacer la zone
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function App() {
  const ESP32_IP = "http://172.20.10.3";
  
  const [history, setHistory] = useState([]);
  const [currentGps, setCurrentGps] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  
  // Paramètres de sécurité (Geofence)
  const [fence, setFence] = useState({
    name: "Zone Sécurisée",
    center: [60.1699, 24.9384],
    radius: 100
  });
  
  const [isOutOfZone, setIsOutOfZone] = useState(false);
  const markerRef = useRef(null);

  const checkGeofence = (lat, lng, center, radius) => {
    const currentPoint = L.latLng(lat, lng);
    const centerPoint = L.latLng(center[0], center[1]);
    const distanceMeters = currentPoint.distanceTo(centerPoint);
    setIsOutOfZone(distanceMeters > radius);
  };

  const hasMovedEnough = (newLat, newLng, oldLat, oldLng, minMeters = 5) => {
    if (!oldLat || !oldLng) return true;
    const p1 = L.latLng(newLat, newLng);
    const p2 = L.latLng(oldLat, oldLng);
    return p1.distanceTo(p2) >= minMeters;
  };

  useEffect(() => {
    const fetchGpsData = async () => {
      try {
        const response = await fetch(`${ESP32_IP}/gps`);
        if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
        
        const result = await response.json();
        
        // Récupération du session_id et du tableau
        const incomingSessionId = result.session_id || null;
        const data = Array.isArray(result) ? result : (result.data || []);
        
        // RÉINITIALISATION LORS D'UN FLASH / REDÉMARRAGE DE L'ESP32 :
        // Si le session_id change ou si l'ESP32 renvoie un tableau vide
        if ((incomingSessionId && sessionId && incomingSessionId !== sessionId) || data.length === 0) {
          console.warn("ESP32 redémarré : réinitialisation de la carte.");
          setHistory([]);
          setCurrentGps(null);
          setSessionId(incomingSessionId);
          return;
        }

        if (incomingSessionId) {
          setSessionId(incomingSessionId);
        }

        if (data.length > 0) {
          const validPoints = data.filter(pt => pt.latitude !== 0 && pt.longitude !== 0);
          
          if (validPoints.length > 0) {
            const latest = validPoints[validPoints.length - 1];
            
            // Filtre anti-saut aberrant (ignore les téléportations > 200m)
            if (currentGps) {
              const prevPoint = L.latLng(currentGps.lat, currentGps.lng);
              const newPoint = L.latLng(latest.latitude, latest.longitude);
              if (prevPoint.distanceTo(newPoint) > 200) {
                console.warn("Saut GPS aberrant ignoré.");
                return;
              }
            }

            const isMoved = !currentGps || hasMovedEnough(
              latest.latitude, 
              latest.longitude, 
              currentGps.lat, 
              currentGps.lng, 
              5
            );

            if (isMoved) {
              // Intégration de la vitesse dans l'état (avec un fallback à 0)
              setCurrentGps({ 
                lat: latest.latitude, 
                lng: latest.longitude, 
                speed: latest.speed || 0 
              });
              setHistory(validPoints.map(pt => [pt.latitude, pt.longitude]));
              checkGeofence(latest.latitude, latest.longitude, fence.center, fence.radius);
            }
          }
        }
      } catch (error) {
        console.error("Erreur de récupération ESP32:", error);
      }
    };

    fetchGpsData();
    const interval = setInterval(fetchGpsData, 10000); // Polling toutes les 10 secondes
    return () => clearInterval(interval);
  }, [fence, currentGps, sessionId]);

  const updateZoneCenter = (lat, lng) => {
    setFence(prev => ({ ...prev, center: [lat, lng] }));
    if (currentGps) {
      checkGeofence(currentGps.lat, currentGps.lng, [lat, lng], fence.radius);
    }
  };

  const setZoneToCurrentPosition = () => {
    if (currentGps) {
      updateZoneCenter(currentGps.lat, currentGps.lng);
    }
  };

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          updateZoneCenter(latLng.lat, latLng.lng);
        }
      },
    }),
    [currentGps, fence.radius]
  );

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      
      {/* Panneau Flottant (Coin supérieur gauche) */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '16px 20px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        backdropFilter: 'blur(5px)',
        maxWidth: '320px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#2c3e50' }}>ESP32 Geofencing</h2>
        
        {isOutOfZone && (
          <div style={{
            backgroundColor: '#e74c3c',
            color: 'white',
            padding: '10px 12px',
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            textAlign: 'center'
          }}>
            ALERTE : Capteur hors de la zone "{fence.name}"
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#7f8c8d' }}>NOM DE LA ZONE</label>
          <input 
            type="text" 
            value={fence.name} 
            onChange={(e) => setFence({ ...fence, name: e.target.value })}
            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.9rem' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#7f8c8d' }}>RAYON (MÈTRES)</label>
          <input 
            type="number" 
            value={fence.radius} 
            onChange={(e) => {
              const newRadius = Number(e.target.value);
              setFence(prev => ({ ...prev, radius: newRadius }));
              if (currentGps) {
                checkGeofence(currentGps.lat, currentGps.lng, fence.center, newRadius);
              }
            }}
            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.9rem' }}
          />
        </div>

        {/* Nouvel encart pour la vitesse */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#7f8c8d' }}>VITESSE ACTUELLE</label>
          <div style={{ 
            padding: '8px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '6px', 
            border: '1px solid #ccc', 
            fontSize: '0.9rem', 
            fontWeight: 'bold' 
          }}>
            {currentGps ? `${currentGps.speed.toFixed(1)} km/h` : '-- km/h'}
          </div>
        </div>

        <button 
          onClick={setZoneToCurrentPosition} 
          disabled={!currentGps}
          style={{
            padding: '10px',
            backgroundColor: currentGps ? '#3498db' : '#bdc3c7',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: currentGps ? 'pointer' : 'not-allowed'
          }}
        >
          Centrer zone sur capteur
        </button>
      </div>

      {/* Carte Leaflet Plein Écran */}
      {currentGps ? (
        <MapContainer 
          center={[currentGps.lat, currentGps.lng]} 
          zoom={16} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapClickHandler onMapClick={updateZoneCenter} />

          {/* Marqueur Capteur ESP32 avec la vitesse dans la popup */}
          <Marker position={[currentGps.lat, currentGps.lng]} icon={sensorIcon}>
            <Popup>
              <b>Capteur ESP32</b><br />
              Lat : {currentGps.lat.toFixed(5)}<br />
              Lng : {currentGps.lng.toFixed(5)}<br />
              Vitesse : {currentGps.speed.toFixed(1)} km/h
            </Popup>
          </Marker>

          {/* Marqueur Centre du Geofence */}
          <Marker 
            draggable={true}
            eventHandlers={eventHandlers}
            position={fence.center}
            ref={markerRef}
            icon={fenceCenterIcon}
          >
            <Popup>
              <b>{fence.name || "Zone sans nom"}</b><br />
              Rayon : {fence.radius}m
            </Popup>
          </Marker>

          <Polyline positions={history} color="#2ecc71" weight={4} />

          <Circle 
            center={fence.center} 
            radius={fence.radius}
            pathOptions={{
              color: isOutOfZone ? '#e74c3c' : '#3498db',
              fillColor: isOutOfZone ? '#e74c3c' : '#3498db',
              fillOpacity: 0.2
            }}
          />
        </MapContainer>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', backgroundColor: '#ecf0f1', fontFamily: 'sans-serif', color: '#7f8c8d' }}>
          <h2>Attente de la première position du capteur ESP32...</h2>
        </div>
      )}
    </div>
  );
}

export default App;