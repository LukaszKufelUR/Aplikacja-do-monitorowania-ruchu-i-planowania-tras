import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for Leaflet marker icons in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Component to handle map clicks
function MapClickHandler({ onMapClick }) {
    useMapEvents({
        click: (e) => {
            onMapClick([e.latlng.lat, e.latlng.lng]);
        }
    });
    return null;
}

// Component to update map view when route changes
function MapUpdater({ center, routeCoords }) {
    const map = useMap();

    useEffect(() => {
        if (routeCoords && routeCoords.length > 0) {
            const bounds = L.latLngBounds(routeCoords);
            map.fitBounds(bounds, { padding: [50, 50] });
        } else if (center) {
            map.setView(center, 13);
        }
    }, [center, routeCoords, map]);

    return null;
}

const MapComponent = ({ routeCoords, trafficSegments, onMapClick, clickedStart, clickedDestination, pins = [], onPinDelete, onPinEdit, center, busStops = [], showBusStops = true }) => {
    const mapRef = useRef(null);
    const defaultPosition = [50.0412, 21.9991]; // Rzeszów coordinates

    // Color mapping for traffic levels
    const trafficColors = {
        green: '#22c55e',   // Good traffic
        yellow: '#eab308',  // Moderate traffic
        orange: '#f97316',  // Heavy traffic
        red: '#ef4444'      // Severe congestion
    };

    return (
        <MapContainer center={defaultPosition} zoom={13} style={{ height: '100%', width: '100%' }} ref={mapRef}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapUpdater center={center || defaultPosition} routeCoords={routeCoords} />
            <MapClickHandler onMapClick={onMapClick} />

            {/* Bus Stops - MPK */}
            {showBusStops && busStops.map(stop => {
                // Create bus stop icon using SVG
                const busIcon = L.divIcon({
                    html: `
                        <div style="
                            background-color: #3b82f6;
                            border: 2px solid white;
                            border-radius: 50%;
                            width: 24px;
                            height: 24px;
                            display: flex;
                            align-items: center;
                            justify-center;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                        ">
                            <span style="font-size: 14px;">🚌</span>
                        </div>
                    `,
                    className: 'bus-stop-marker',
                    iconSize: [24, 24],
                    iconAnchor: [12, 12],
                    popupAnchor: [0, -12]
                });

                return (
                    <Marker
                        key={`bus-${stop.stop_id}`}
                        position={[stop.lat, stop.lon]}
                        icon={busIcon}
                    >
                        <Popup>
                            <div className="min-w-[150px]">
                                <h3 className="font-bold text-sm mb-1">🚏 {stop.name}</h3>
                                <p className="text-xs text-gray-600">Przystanek MPK</p>
                                <p className="text-xs text-gray-500 mt-1">ID: {stop.stop_id}</p>
                            </div>
                        </Popup>
                    </Marker>
                );
            })}

            {/* Pins - using colored SVG markers */}
            {pins.map(pin => {
                // Create colored marker icon using SVG
                const pinColor = pin.color || '#3b82f6';
                const svgIcon = `
                    <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 8.4 12.5 28.5 12.5 28.5S25 20.9 25 12.5C25 5.6 19.4 0 12.5 0z" 
                              fill="${pinColor}" 
                              stroke="#fff" 
                              stroke-width="1.5"/>
                        <circle cx="12.5" cy="12.5" r="4" fill="#fff"/>
                    </svg>
                `;

                const coloredIcon = L.divIcon({
                    html: svgIcon,
                    className: 'custom-marker-icon',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34]
                });

                return (
                    <Marker
                        key={pin.id}
                        position={[pin.lat, pin.lon]}
                        icon={coloredIcon}
                    >
                        <Popup>
                            <div className="min-w-[200px]">
                                <div className="flex items-center gap-2 mb-2">
                                    <div
                                        className="w-4 h-4 rounded-full border border-gray-300"
                                        style={{ backgroundColor: pin.color || 'blue' }}
                                    />
                                    <h3 className="font-bold text-lg flex-1">{pin.name}</h3>
                                </div>
                                {pin.note && (
                                    <p className="text-sm text-gray-600 mb-3 border-l-2 border-gray-300 pl-2">
                                        {pin.note}
                                    </p>
                                )}
                                <div className="flex gap-2 mt-3">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onPinEdit) onPinEdit(pin);
                                        }}
                                        className="flex-1 px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors flex items-center justify-center gap-1"
                                    >
                                        <span>✏️</span> Edytuj
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onPinDelete) onPinDelete(pin.id);
                                        }}
                                        className="flex-1 px-3 py-1.5 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors flex items-center justify-center gap-1"
                                    >
                                        <span>🗑️</span> Usuń
                                    </button>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                );
            })}

            {/* Start point marker (green) */}
            {clickedStart && (
                <Marker position={clickedStart}>
                    <Popup>
                        Start: [{clickedStart[0].toFixed(4)}, {clickedStart[1].toFixed(4)}]
                        {!clickedDestination && <><br />Kliknij ponownie, aby wybrać cel</>}
                    </Popup>
                </Marker>
            )}

            {/* Destination point marker (red) */}
            {clickedDestination && (
                <Marker position={clickedDestination}>
                    <Popup>
                        Cel: [{clickedDestination[0].toFixed(4)}, {clickedDestination[1].toFixed(4)}]
                    </Popup>
                </Marker>
            )}

            {/* Route Visualization with Traffic Colors */}
            {trafficSegments && trafficSegments.length > 0 ? (
                // Multi-colored traffic segments
                trafficSegments.map((segment, idx) => (
                    <Polyline
                        key={idx}
                        positions={segment.coords}
                        color={trafficColors[segment.color] || '#3b82f6'}
                        weight={5}
                        opacity={0.8}
                    />
                ))
            ) : routeCoords ? (
                // Fallback to single-color route if no traffic data
                <Polyline positions={routeCoords} color="blue" weight={5} opacity={0.7} />
            ) : null}

            {/* Traffic Legend */}
            {trafficSegments && trafficSegments.length > 0 && (
                <div style={{
                    position: 'absolute',
                    bottom: '20px',
                    right: '10px',
                    backgroundColor: 'white',
                    padding: '10px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                    fontSize: '12px'
                }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>Natężenie ruchu:</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                        <div style={{ width: '20px', height: '4px', backgroundColor: trafficColors.green, borderRadius: '2px' }}></div>
                        <span>Płynny</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                        <div style={{ width: '20px', height: '4px', backgroundColor: trafficColors.yellow, borderRadius: '2px' }}></div>
                        <span>Umiarkowany</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                        <div style={{ width: '20px', height: '4px', backgroundColor: trafficColors.orange, borderRadius: '2px' }}></div>
                        <span>Duży</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '20px', height: '4px', backgroundColor: trafficColors.red, borderRadius: '2px' }}></div>
                        <span>Korek</span>
                    </div>
                </div>
            )}
        </MapContainer>
    );
};

export default MapComponent;
