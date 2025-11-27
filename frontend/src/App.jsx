import React, { useState, useEffect } from 'react';
import MapComponent from './components/MapComponent';
import Login from './components/Login';
import Register from './components/Register';
import { useAuth } from './context/AuthContext';
import { Car, BarChart3, Navigation, Bike, Footprints, Search, MapPin, LogOut, User, LogIn, X, Plus, Trash2, Edit2 } from 'lucide-react';
import Modal from './components/Modal';
import Notification from './components/Notification';

function App() {
    const { isAuthenticated, user, logout, loading, token } = useAuth();
    const [showAuth, setShowAuth] = useState(false);
    const [authView, setAuthView] = useState('login'); // 'login' or 'register'

    // Show loading while checking authentication
    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-100">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Ładowanie...</p>
                </div>
            </div>
        );
    }

    const handleLoginClick = () => {
        setAuthView('login');
        setShowAuth(true);
    };

    const handleRegisterClick = () => {
        setAuthView('register');
        setShowAuth(true);
    };

    const handleAuthCancel = () => {
        setShowAuth(false);
    };

    return (
        <div className="relative h-screen overflow-hidden">
            <TrafficWatchApp
                user={user}
                isAuthenticated={isAuthenticated}
                onLogout={logout}
                onLoginClick={handleLoginClick}
                token={token}
            />

            {showAuth && (
                <div className="absolute inset-0 z-[2000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-md relative bg-white rounded-2xl shadow-2xl overflow-hidden">
                        <button
                            onClick={handleAuthCancel}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        {authView === 'login' ? (
                            <Login
                                onSwitchToRegister={() => setAuthView('register')}
                                onSuccess={() => setShowAuth(false)}
                            />
                        ) : (
                            <Register
                                onSwitchToLogin={() => setAuthView('login')}
                                onSuccess={() => setShowAuth(false)}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function TrafficWatchApp({ user, isAuthenticated, onLogout, onLoginClick, token }) {
    const [routes, setRoutes] = useState([]);
    const [selectedRoute, setSelectedRoute] = useState(null);

    // Search State
    const [fromLocation, setFromLocation] = useState('');
    const [toLocation, setToLocation] = useState('');
    const [fromCoords, setFromCoords] = useState(null);
    const [toCoords, setToCoords] = useState(null);
    const [searchResult, setSearchResult] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [routePath, setRoutePath] = useState(null);
    const [tripTime, setTripTime] = useState(''); // Empty string means "now"

    // Autocomplete State
    const [fromSuggestions, setFromSuggestions] = useState([]);
    const [toSuggestions, setToSuggestions] = useState([]);
    const [showFromSuggestions, setShowFromSuggestions] = useState(false);
    const [showToSuggestions, setShowToSuggestions] = useState(false);

    // Click-based routing state (two-click system)
    const [clickedStart, setClickedStart] = useState(null);
    const [clickedDestination, setClickedDestination] = useState(null);
    const [clickRoutes, setClickRoutes] = useState(null);
    const [activeRouteMode, setActiveRouteMode] = useState('car');

    // Pin State
    const [pins, setPins] = useState([]);
    const [isPinMode, setIsPinMode] = useState(false);

    // Transit/Bus Stops State
    const [busStops, setBusStops] = useState([]);
    const [selectedBusStop, setSelectedBusStop] = useState(null);
    const [showBusStops, setShowBusStops] = useState(false); // Hidden by default - too many stops

    // UI State
    const [notification, setNotification] = useState(null);
    const [modal, setModal] = useState({ isOpen: false, type: 'confirm', title: '', message: '', onConfirm: () => { } });
    const [mapCenter, setMapCenter] = useState(null);
    const [trafficSegments, setTrafficSegments] = useState(null);

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
    };

    const closeModal = () => {
        setModal(prev => ({ ...prev, isOpen: false }));
    };

    useEffect(() => {
        if (isAuthenticated && token) {
            fetchRoutes();
            fetchPins();
        } else {
            setRoutes([]);
            setPins([]);
        }
    }, [isAuthenticated, token]);

    // Fetch bus stops on mount (public data, no auth needed)
    useEffect(() => {
        fetchBusStops();
    }, []);

    const fetchBusStops = async () => {
        try {
            const response = await fetch('http://127.0.0.1:8000/transit/stops');
            if (response.ok) {
                const data = await response.json();
                setBusStops(data.stops || []);
                console.log(`Loaded ${data.count} bus stops`);
            }
        } catch (error) {
            console.error("Failed to fetch bus stops", error);
        }
    };

    // Auto-refresh route when trip time changes
    useEffect(() => {
        if (searchResult && ((fromCoords || clickedStart) && (toCoords || clickedDestination))) {
            handleSearch();
        }
    }, [tripTime]);

    const fetchPins = async () => {
        try {
            const response = await fetch('http://127.0.0.1:8000/pins/', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setPins(data);
            }
        } catch (error) {
            console.error("Failed to fetch pins", error);
        }
    };

    const fetchRoutes = async () => {
        try {
            const response = await fetch('http://127.0.0.1:8000/routes/', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    setRoutes(data.map(r => ({ ...r, time: 'Zapisana' })));
                } else {
                    console.error("Received non-array data for routes:", data);
                    setRoutes([]);
                }
            } else {
                console.error("Failed to fetch routes:", response.status);
            }
        } catch (error) {
            console.error("Failed to fetch routes", error);
            setRoutes([]);
        }
    };

    const saveRoute = (mode) => {
        if (!isAuthenticated || !searchResult || !searchResult[mode]) return;

        const originName = fromLocation || "Start";
        const destName = toLocation || "Cel";
        const defaultName = `${originName} -> ${destName}`;

        setModal({
            isOpen: true,
            type: 'input',
            title: 'Zapisz trasę',
            message: 'Podaj nazwę dla tej trasy:',
            initialValue: defaultName,
            onConfirm: (customName) => executeSaveRoute(mode, customName, originName, destName)
        });
    };

    const executeSaveRoute = async (mode, customName, originName, destName) => {
        closeModal();
        if (!customName) return;

        try {
            // Determine which coordinates to use (Search vs Click)
            let startLat, startLon, endLat, endLon;

            if (clickedStart && clickedDestination) {
                startLat = clickedStart[0];
                startLon = clickedStart[1];
                endLat = clickedDestination[0];
                endLon = clickedDestination[1];
            } else if (fromCoords && toCoords) {
                startLat = fromCoords[0];
                startLon = fromCoords[1];
                endLat = toCoords[0];
                endLon = toCoords[1];
            }

            // Get geometry from current search result
            const geometryData = searchResult && searchResult[mode] && searchResult[mode].geometry
                ? JSON.stringify(searchResult[mode].geometry)
                : null;

            const response = await fetch('http://127.0.0.1:8000/routes/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: customName,
                    origin: originName,
                    destination: destName,
                    origin_lat: startLat,
                    origin_lon: startLon,
                    dest_lat: endLat,
                    dest_lon: endLon,
                    geometry_json: geometryData,
                    transport_mode: mode
                })
            });

            if (response.ok) {
                showNotification("Trasa została zapisana!", "success");
                fetchRoutes();
            } else {
                showNotification("Błąd podczas zapisywania trasy.", "error");
            }
        } catch (error) {
            console.error("Error saving route:", error);
            showNotification("Błąd połączenia.", "error");
        }
    };

    const deleteRoute = (routeId, e) => {
        e.stopPropagation();
        setModal({
            isOpen: true,
            type: 'confirm',
            title: 'Usuń trasę',
            message: 'Czy na pewno chcesz usunąć tę trasę?',
            onConfirm: () => executeDeleteRoute(routeId)
        });
    };

    const executeDeleteRoute = async (routeId) => {
        closeModal();
        try {
            const response = await fetch(`http://127.0.0.1:8000/routes/${routeId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                fetchRoutes();
                if (selectedRoute && selectedRoute.id === routeId) {
                    setSelectedRoute(null);
                    setRoutePath(null);
                    setClickedStart(null);
                    setClickedDestination(null);
                    setTrafficSegments(null);
                    setSearchResult(null);
                }
                showNotification("Trasa została usunięta.", "success");
            } else {
                showNotification("Nie udało się usunąć trasy.", "error");
            }
        } catch (error) {
            console.error("Error deleting route:", error);
            showNotification("Błąd połączenia.", "error");
        }
    };

    const renameRoute = (route, e) => {
        e.stopPropagation();
        setModal({
            isOpen: true,
            type: 'input',
            title: 'Zmień nazwę',
            message: 'Podaj nową nazwę trasy:',
            initialValue: route.name,
            onConfirm: (newName) => executeRenameRoute(route, newName)
        });
    };

    const executeRenameRoute = async (route, newName) => {
        closeModal();
        if (!newName || newName === route.name) return;

        try {
            const response = await fetch(`http://127.0.0.1:8000/routes/${route.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newName, transport_mode: route.transport_mode })
            });

            if (response.ok) {
                fetchRoutes();
                showNotification("Nazwa trasy została zmieniona.", "success");
            } else {
                showNotification("Nie udało się zmienić nazwy trasy.", "error");
            }
        } catch (error) {
            console.error("Error renaming route:", error);
            showNotification("Błąd połączenia.", "error");
        }
    };

    const editRouteMode = (route, e) => {
        e.stopPropagation();
        console.log('Route transport_mode:', route.transport_mode, 'Full route:', route);
        setModal({
            isOpen: true,
            type: 'route_mode',
            title: 'Zmień tryb transportu',
            message: `Wybierz nowy tryb transportu dla trasy "${route.name}":`,
            initialMode: route.transport_mode || 'car',
            onConfirm: (newMode) => executeEditRouteMode(route, newMode)
        });
    };

    const executeEditRouteMode = async (route, newMode) => {
        closeModal();
        if (!newMode || newMode === route.transport_mode) return;

        try {
            const response = await fetch(`http://127.0.0.1:8000/routes/${route.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: route.name, transport_mode: newMode })
            });

            if (response.ok) {
                fetchRoutes();
                showNotification("Tryb transportu został zmieniony.", "success");
                // Reload route with new mode if it's currently selected
                if (selectedRoute?.id === route.id) {
                    handleSavedRouteClick({ ...route, transport_mode: newMode });
                }
            } else if (response.status === 401) {
                showNotification("Sesja wygasła. Zaloguj się ponownie.", "error");
                setTimeout(() => onLogout(), 2000);
            } else {
                showNotification("Nie udało się zmienić trybu transportu.", "error");
            }
        } catch (error) {
            console.error("Error changing route mode:", error);
            showNotification("Błąd połączenia.", "error");
        }
    };

    const savePin = async ({ name, note, color }, lat, lon) => {
        closeModal();
        if (!name) return;

        try {
            const response = await fetch('http://127.0.0.1:8000/pins/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, note, color, lat, lon })
            });

            if (response.ok) {
                fetchPins();
                showNotification("Pinezka została dodana!", "success");
            } else {
                showNotification("Błąd podczas dodawania pinezki.", "error");
            }
        } catch (error) {
            console.error("Error saving pin:", error);
            showNotification("Błąd połączenia.", "error");
        }
    };

    const deletePin = async (pinId) => {
        try {
            const response = await fetch(`http://127.0.0.1:8000/pins/${pinId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                fetchPins();
                showNotification("Pinezka usunięta.", "success");
            }
        } catch (error) {
            console.error("Error deleting pin:", error);
        }
    };

    const editPin = (pin) => {
        setModal({
            isOpen: true,
            type: 'pin',
            title: 'Edytuj Pinezkę',
            message: 'Zmień szczegóły pinezki:',
            initialValue: pin.name,
            initialNote: pin.note || '',
            initialColor: pin.color || '#0000ff',
            onConfirm: (pinData) => executeEditPin(pin.id, pinData, pin.lat, pin.lon)
        });
    };

    const executeEditPin = async (pinId, { name, note, color }, lat, lon) => {
        closeModal();
        if (!name) return;

        try {
            const response = await fetch(`http://127.0.0.1:8000/pins/${pinId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, note, color, lat, lon })
            });

            if (response.ok) {
                fetchPins();
                showNotification("Pinezka została zaktualizowana!", "success");
            } else {
                showNotification("Błąd podczas aktualizacji pinezki.", "error");
            }
        } catch (error) {
            console.error("Error updating pin:", error);
            showNotification("Błąd połączenia.", "error");
        }
    };

    const handlePinClick = async (pin) => {
        // Clear previous route data
        setRoutePath(null);
        setSelectedRoute(null);
        setTrafficSegments(null);
        setSearchResult(null);
        setClickRoutes(null);

        // Set pin as the starting point for route planning
        const pinCoords = [pin.lat, pin.lon];
        setClickedStart(pinCoords);
        setFromCoords(pinCoords);
        setFromLocation(pin.name);

        // Clear destination
        setClickedDestination(null);
        setToCoords(null);
        setToLocation('');

        // Center map on the pin
        setMapCenter(pinCoords);
        showNotification(`Punkt startowy: ${pin.name}. Kliknij na mapie, aby wybrać cel.`, "info");
    };

    const handleSavedRouteClick = async (route) => {
        setSelectedRoute(route);

        // Use stored coordinates if available
        if (route.origin_lat && route.origin_lon && route.dest_lat && route.dest_lon) {
            const startCoords = [route.origin_lat, route.origin_lon];
            const destCoords = [route.dest_lat, route.dest_lon];

            setClickedStart(startCoords);
            setClickedDestination(destCoords);

            // Check if we have cached geometry
            if (route.geometry_json) {
                try {
                    const geometry = JSON.parse(route.geometry_json);
                    const leafletCoords = convertOSRMToLeaflet(geometry);
                    setRoutePath(leafletCoords);
                    setActiveRouteMode('car');

                    // Still fetch all routes for the cards, but show cached route immediately
                    fetchRoute('car', startCoords, destCoords).then(carRoute => {
                        if (carRoute) {
                            Promise.all([
                                Promise.resolve(carRoute),
                                fetchRoute('bike', startCoords, destCoords),
                                fetchRoute('walk', startCoords, destCoords)
                            ]).then(([car, bike, walk]) => {
                                if (car && bike && walk) {
                                    const routes = {
                                        car: {
                                            time: formatTime(car.duration),
                                            distance: `${car.distance} km`,
                                            geometry: car.geometry
                                        },
                                        bike: {
                                            time: formatTime(bike.duration),
                                            distance: `${bike.distance} km`,
                                            geometry: bike.geometry
                                        },
                                        walk: {
                                            time: formatTime(walk.duration),
                                            distance: `${walk.distance} km`,
                                            geometry: walk.geometry
                                        }
                                    };
                                    setSearchResult(routes);
                                    setClickRoutes(routes);
                                }
                            });
                        }
                    });

                    return; // Exit early since we're using cached geometry
                } catch (error) {
                    console.error("Error parsing cached geometry:", error);
                    // Fall through to fetch from OSRM
                }
            }

            // Fetch route for visualization (fallback if no cached geometry)
            try {
                const carRoute = await fetchRoute('car', startCoords, destCoords);
                const bikeRoute = await fetchRoute('bike', startCoords, destCoords);
                const walkRoute = await fetchRoute('walk', startCoords, destCoords);

                if (carRoute && bikeRoute && walkRoute) {
                    const routes = {
                        car: {
                            time: formatTime(carRoute.duration),
                            distance: `${carRoute.distance} km`,
                            geometry: carRoute.geometry
                        },
                        bike: {
                            time: formatTime(bikeRoute.duration),
                            distance: `${bikeRoute.distance} km`,
                            geometry: bikeRoute.geometry
                        },
                        walk: {
                            time: formatTime(walkRoute.duration),
                            distance: `${walkRoute.distance} km`,
                            geometry: walkRoute.geometry
                        }
                    };

                    setSearchResult(routes);
                    setClickRoutes(routes);
                    setActiveRouteMode('car');
                    const leafletCoords = convertOSRMToLeaflet(carRoute.geometry);
                    setRoutePath(leafletCoords);
                } else {
                    showNotification("Nie udało się pobrać trasy.", "error");
                }
            } catch (error) {
                console.error("Error fetching saved route:", error);
                showNotification("Błąd podczas wczytywania trasy.", "error");
            }
        } else {
            showNotification("Ta trasa nie ma zapisanych współrzędnych.", "error");
        }
    };

    const fetchSuggestions = async (query, setSuggestions) => {
        if (query.length < 3) {
            setSuggestions([]);
            return;
        }

        try {
            // 1. Filtruj pinezki po nazwie
            const matchingPins = pins.filter(pin =>
                pin.name.toLowerCase().includes(query.toLowerCase())
            ).map(pin => ({
                isPin: true,
                name: pin.name,
                note: pin.note,
                lat: pin.lat,
                lon: pin.lon,
                display_name: `${pin.name}${pin.note ? ` (${pin.note})` : ''}`
            }));

            // 2. Pobierz adresy z Nominatim
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&viewbox=21.9,49.9,22.1,50.1&bounded=1&limit=5`
            );
            const nominatimResults = await response.json();

            // 3. Połącz: pinezki na górze, potem Nominatim
            setSuggestions([...matchingPins, ...nominatimResults]);
        } catch (error) {
            console.error("Error fetching suggestions:", error);
        }
    };

    const handleLocationInput = (value, setLocation, setSuggestions, setShow, setCoords) => {
        setLocation(value);
        setCoords(null);
        if (value.length > 2) {
            fetchSuggestions(value, setSuggestions);
            setShow(true);
        } else {
            setShow(false);
        }
    };

    const selectLocation = (location, setLocation, setSuggestions, setShow, setCoords) => {
        setLocation(location.display_name.split(',')[0]);
        setCoords([parseFloat(location.lat), parseFloat(location.lon)]);
        setSuggestions([]);
        setShow(false);
    };

    // Statistics calculation functions
    const calculateTrafficStats = () => {
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const weekdayPeaks = [];

        hours.forEach(hour => {
            const mockTime = new Date();
            mockTime.setHours(hour, 0, 0, 0);
            mockTime.setDate(mockTime.getDate() - (mockTime.getDay() === 0 ? 6 : mockTime.getDay() - 1)); // Set to Monday

            const trafficInfo = calculateTrafficDelay(3600, mockTime.toISOString());
            const delayPercent = ((trafficInfo.congestionFactor - 1.0) * 100);

            if (delayPercent > 30) {
                weekdayPeaks.push({ hour, delay: delayPercent, level: trafficInfo.trafficLevel });
            }
        });

        weekdayPeaks.sort((a, b) => b.delay - a.delay);
        return weekdayPeaks.slice(0, 3);
    };

    const getTopRoutes = () => {
        const routeCounts = {};
        routes.forEach(route => {
            const key = `${route.origin} → ${route.destination}`;
            routeCounts[key] = (routeCounts[key] || 0) + 1;
        });

        return Object.entries(routeCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([route, count]) => ({ route, count }));
    };

    const getTransportModeStats = () => {
        const modeCounts = { car: 0, bike: 0, walk: 0 };
        routes.forEach(route => {
            const mode = route.transport_mode || 'car';
            modeCounts[mode] = (modeCounts[mode] || 0) + 1;
        });

        const total = routes.length || 1;
        return {
            car: Math.round((modeCounts.car / total) * 100),
            bike: Math.round((modeCounts.bike / total) * 100),
            walk: Math.round((modeCounts.walk / total) * 100)
        };
    };

    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) return `${hours} h ${minutes} min`;
        return `${minutes} min`;
    };
    const convertOSRMToLeaflet = (coordinates) => {
        return coordinates.map(coord => [coord[1], coord[0]]);
    };

    const fetchRoute = async (mode, fromCoords, toCoords, customTime = null) => {
        const modeMap = {
            car: 'driving',
            bike: 'cycling',
            walk: 'foot'
        };

        const osrmMode = modeMap[mode];
        const url = `https://router.project-osrm.org/route/v1/${osrmMode}/${fromCoords[1]},${fromCoords[0]};${toCoords[1]},${toCoords[0]}?overview=full&geometries=geojson`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                let distance = route.distance / 1000;
                let baseDuration = route.duration;
                let totalDuration = baseDuration;
                let trafficDelay = 0;
                let trafficLevel = 'low';

                // Apply traffic simulation only for car
                if (mode === 'car') {
                    const trafficInfo = calculateTrafficDelay(baseDuration, customTime);
                    totalDuration = trafficInfo.totalDuration;
                    trafficDelay = trafficInfo.delay;
                    trafficLevel = trafficInfo.trafficLevel;
                } else if (mode === 'bike') {
                    // Use realistic city cycling speed: 15 km/h average
                    // This accounts for traffic lights, intersections, and urban conditions
                    totalDuration = (distance / 15) * 3600; // distance in km, speed 15 km/h, result in seconds
                    // Keep distance as-is from OSRM
                } else if (mode === 'walk') {
                    // Use realistic walking speed: 5 km/h average
                    // Calculate time based on distance, not OSRM's optimistic estimate
                    totalDuration = (distance / 5) * 3600; // distance in km, speed 5 km/h, result in seconds
                    // Keep distance as-is from OSRM
                }

                return {
                    distance: distance.toFixed(1),
                    duration: totalDuration,
                    baseDuration: baseDuration,
                    trafficDelay: trafficDelay,
                    trafficLevel: trafficLevel,
                    geometry: route.geometry.coordinates
                };
            }
        } catch (error) {
            console.error(`Error fetching ${mode} route:`, error);
        }
        return null;
    };

    const fetchTrafficData = async (coordinates) => {
        try {
            console.log('Fetching traffic data for coordinates:', coordinates);

            let url = 'http://127.0.0.1:8000/traffic/flow';
            if (tripTime) {
                url += `?simulation_time=${tripTime}`;
                console.log('Using simulation time:', tripTime);
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(coordinates)
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Traffic data received:', data);
                return data.segments;
            } else {
                console.error('Traffic API error:', response.status, await response.text());
            }
        } catch (error) {
            console.error('Error fetching traffic data:', error);
        }
        return null;
    };

    const calculateTrafficDelay = (baseDuration, customTimeStr = null) => {
        const now = customTimeStr ? new Date(customTimeStr) : new Date();
        const hour = now.getHours() + now.getMinutes() / 60;
        const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

        // Bazowy mnożnik dla Rzeszowa (korekta na realia miejskie, światła, przejścia)
        const baseCityFactor = 1.15;

        // Funkcja pomocnicza do obliczania wpływu szczytu (krzywa Gaussa)
        const calculatePeak = (peakHour, width, intensity) => {
            return intensity * Math.exp(-Math.pow(hour - peakHour, 2) / (2 * Math.pow(width, 2)));
        };

        let congestionFactor = 1.0;
        let trafficLevel = 'low';

        // 1. Logika dla dni roboczych (Poniedziałek - Piątek)
        if (day >= 1 && day <= 5) {
            // Poranny szczyt (wszystkie dni robocze podobnie)
            // Szczyt ok. 7:40, szeroki na ok. 1.5h
            const morningPeak = calculatePeak(7.66, 0.9, 0.7); // Max +70% czasu

            // Popołudniowy szczyt
            let afternoonPeak = 0;

            if (day === 5) {
                // PIĄTEK: Szczyt zaczyna się wcześniej i jest większy (wyjazdy)
                // Szczyt ok. 15:00, szeroki
                afternoonPeak = calculatePeak(15.0, 1.2, 0.85); // Max +85% czasu
            } else {
                // PON-CZW: Standardowy szczyt popołudniowy
                // Szczyt ok. 16:15
                afternoonPeak = calculatePeak(16.25, 1.0, 0.75); // Max +75% czasu
            }

            // Ruch biznesowy w ciągu dnia (10-14)
            const businessTraffic = (hour > 9 && hour < 14.5) ? 0.15 : 0;

            // Wieczorne wyciszenie
            const eveningTraffic = (hour > 18 && hour < 21) ? 0.05 : 0;

            congestionFactor += morningPeak + afternoonPeak + businessTraffic + eveningTraffic;
        }
        // 2. Logika dla Soboty
        else if (day === 6) {
            // Szczyt zakupowy/wyjazdowy (11:00 - 13:00)
            const saturdayPeak = calculatePeak(12.0, 1.5, 0.3); // Max +30%
            congestionFactor += saturdayPeak;
        }
        // 3. Logika dla Niedzieli
        else if (day === 0) {
            // Powroty wieczorne (17:00 - 19:00)
            const sundayReturn = calculatePeak(18.0, 1.5, 0.25); // Max +25%
            // Bardzo spokojnie rano
            if (hour < 10) congestionFactor = 0.95; // Puste miasto
            else congestionFactor += sundayReturn;
        }

        // Dodanie losowości (symulacja pogody, zdarzeń losowych) - +/- 5%
        const randomNoise = (Math.random() * 0.1) - 0.05;
        congestionFactor += randomNoise;

        // Finalne obliczenia
        // Zawsze aplikujemy baseCityFactor, bo OSRM jest zbyt optymistyczny dla miast
        const totalFactor = baseCityFactor * congestionFactor;

        // Zabezpieczenie przed nierealistycznie małymi wartościami (np. w nocy)
        const finalFactor = Math.max(totalFactor, 1.0);

        const totalDuration = baseDuration * finalFactor;
        const delay = totalDuration - baseDuration;

        // Określenie poziomu ruchu dla UI
        const delayPercentage = (finalFactor - 1.0) * 100;
        if (delayPercentage > 40) trafficLevel = 'high';
        else if (delayPercentage > 15) trafficLevel = 'medium';
        else trafficLevel = 'low';

        return {
            delay: Math.round(delay),
            totalDuration: Math.round(totalDuration),
            trafficLevel,
            congestionFactor: finalFactor
        };
    };

    const reverseGeocode = async (lat, lon) => {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await response.json();

            // Pobierz pełny adres i podziel na części
            const parts = data.display_name.split(',').map(p => p.trim());

            // Jeśli pierwszy element to numer, a drugi to ulica/osiedle, połącz je
            if (parts.length >= 2 && /^\d+/.test(parts[0])) {
                return `${parts[1]} ${parts[0]}`; // np. "Podwisłocze 36"
            }

            // W przeciwnym razie zwróć pierwszy element (np. nazwa POI)
            return parts[0];
        } catch (error) {
            return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
        }
    };

    const handleMapClick = async (coords) => {
        if (isPinMode) {
            setModal({
                isOpen: true,
                type: 'pin',
                title: 'Dodaj Pinezkę',
                message: 'Uzupełnij szczegóły:',
                initialValue: '',
                onConfirm: (pinData) => {
                    savePin(pinData, coords[0], coords[1]);
                    setIsPinMode(false);
                }
            });
            return;
        }

        const address = await reverseGeocode(coords[0], coords[1]);

        // Check if we have a start point (either from clicking or from autocomplete)
        const hasStartPoint = clickedStart || fromCoords;

        if (!hasStartPoint) {
            // No start point yet - set this as start
            setClickedStart(coords);
            setFromLocation(address);
            setFromCoords(coords);
            setClickedDestination(null);
            setToLocation('');
            setToCoords(null);
            setRoutePath(null);
            setSearchResult(null);
            setClickRoutes(null);
        } else if (!clickedDestination && !toCoords) {
            // We have start point but no destination - set this as destination
            const startPoint = clickedStart || fromCoords;

            setClickedDestination(coords);
            setToLocation(address);
            setToCoords(coords);

            // Also update clickedStart if it was only in fromCoords
            if (!clickedStart && fromCoords) {
                setClickedStart(fromCoords);
            }

            setIsSearching(true);

            try {
                const carRoute = await fetchRoute('car', startPoint, coords, tripTime);
                const bikeRoute = await fetchRoute('bike', startPoint, coords);
                const walkRoute = await fetchRoute('walk', startPoint, coords);

                if (carRoute && bikeRoute && walkRoute) {
                    const routes = {
                        car: {
                            time: formatTime(carRoute.duration),
                            distance: `${carRoute.distance} km`,
                            geometry: carRoute.geometry,
                            trafficDelay: carRoute.trafficDelay,
                            trafficLevel: carRoute.trafficLevel
                        },
                        bike: {
                            time: formatTime(bikeRoute.duration),
                            distance: `${bikeRoute.distance} km`,
                            geometry: bikeRoute.geometry
                        },
                        walk: {
                            time: formatTime(walkRoute.duration),
                            distance: `${walkRoute.distance} km`,
                            geometry: walkRoute.geometry
                        }
                    };

                    setClickRoutes(routes);
                    setSearchResult(routes);
                    setActiveRouteMode('car');

                    // Fetch traffic data BEFORE setting route path to avoid color delay
                    const trafficData = await fetchTrafficData(carRoute.geometry);
                    console.log('Raw traffic data:', trafficData);
                    if (trafficData) {
                        // Convert coordinates to Leaflet format for each segment
                        const trafficSegmentsWithLeafletCoords = trafficData.map(segment => ({
                            ...segment,
                            coords: segment.coords.map(coord => [coord[1], coord[0]]) // Convert [lon, lat] to [lat, lon]
                        }));
                        console.log('Converted traffic segments:', trafficSegmentsWithLeafletCoords);
                        setTrafficSegments(trafficSegmentsWithLeafletCoords);
                    } else {
                        console.log('No traffic data received, clearing segments');
                        setTrafficSegments(null);
                    }

                    // Set route path AFTER traffic data is ready
                    const leafletCoords = convertOSRMToLeaflet(carRoute.geometry);
                    setRoutePath(leafletCoords);
                } else {
                    showNotification("Nie udało się znaleźć trasy. Spróbuj innych lokalizacji.", "error");
                    setClickedDestination(null);
                    setToLocation('');
                    setToCoords(null);
                }
            } catch (error) {
                console.error("Error during route calculation:", error);
                showNotification("Wystąpił błąd podczas obliczania trasy.", "error");
                setClickedDestination(null);
                setToLocation('');
                setToCoords(null);
            } finally {
                setIsSearching(false);
            }
        } else {
            // Both points already set - reset and start over with this as new start
            setClickedStart(coords);
            setFromLocation(address);
            setFromCoords(coords);
            setClickedDestination(null);
            setToLocation('');
            setToCoords(null);
            setRoutePath(null);
            setSearchResult(null);
            setClickRoutes(null);
        }
    };

    const handleRouteCardClick = (mode) => {
        if (clickRoutes && clickRoutes[mode]) {
            setActiveRouteMode(mode);
            const leafletCoords = convertOSRMToLeaflet(clickRoutes[mode].geometry);
            setRoutePath(leafletCoords);

            // Clear traffic segments for non-car modes (traffic is only for cars)
            if (mode !== 'car') {
                setTrafficSegments(null);
            }
        }
    };

    const handleSearch = async (e) => {
        if (e) e.preventDefault();

        const start = fromCoords || clickedStart;
        const dest = toCoords || clickedDestination;

        if (!start || !dest) {
            showNotification("Proszę wybrać lokalizacje (z listy lub klikając na mapie).", "error");
            return;
        }

        // Jeśli używamy punktów z mapy, wyczyśćmy stare wyniki kliknięć, ale zachowajmy koordynaty
        // setClickedStart(null); // Nie czyścimy, bo mogą być potrzebne
        // setClickedDestination(null);
        setClickRoutes(null);
        setActiveRouteMode('car');
        setIsSearching(true);

        try {
            const [carRoute, bikeRoute, walkRoute] = await Promise.all([
                fetchRoute('car', start, dest, tripTime),
                fetchRoute('bike', start, dest),
                fetchRoute('walk', start, dest)
            ]);

            // Fetch transit connections (MPK)
            let transitConnections = null;
            try {
                const transitResponse = await fetch('http://127.0.0.1:8000/transit/plan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        from_stop_id: "1001", // Temporary - will be replaced with nearest stop logic
                        to_stop_id: "1002",
                        departure_time: tripTime
                    })
                });
                if (transitResponse.ok) {
                    const transitData = await transitResponse.json();
                    transitConnections = transitData.connections;
                }
            } catch (error) {
                console.log("Transit data unavailable:", error);
            }

            if (carRoute && bikeRoute && walkRoute) {
                const results = {
                    car: {
                        time: formatTime(carRoute.duration),
                        distance: `${carRoute.distance} km`,
                        trafficDelay: carRoute.trafficDelay,
                        trafficLevel: carRoute.trafficLevel,
                        geometry: carRoute.geometry
                    },
                    bike: {
                        time: formatTime(bikeRoute.duration),
                        distance: `${bikeRoute.distance} km`,
                        geometry: bikeRoute.geometry
                    },
                    walk: {
                        time: formatTime(walkRoute.duration),
                        distance: `${walkRoute.distance} km`,
                        geometry: walkRoute.geometry
                    }
                };

                // Add transit if available
                if (transitConnections && transitConnections.length > 0) {
                    const bestConnection = transitConnections[0];
                    results.transit = {
                        time: `${bestConnection.duration} min`,
                        distance: `Linia ${bestConnection.route_number}`,
                        connections: transitConnections,
                        geometry: null // Will be set when user clicks
                    };
                }

                setSearchResult(results);

                // Fetch traffic data BEFORE setting route path to avoid color delay
                const trafficData = await fetchTrafficData(carRoute.geometry);
                if (trafficData) {
                    const trafficSegmentsWithLeafletCoords = trafficData.map(segment => ({
                        ...segment,
                        coords: segment.coords.map(coord => [coord[1], coord[0]])
                    }));
                    setTrafficSegments(trafficSegmentsWithLeafletCoords);
                } else {
                    setTrafficSegments(null);
                }

                // Set route path AFTER traffic data is ready
                const leafletCoords = convertOSRMToLeaflet(carRoute.geometry);
                setRoutePath(leafletCoords);
            } else {
                showNotification("Nie udało się znaleźć trasy. Spróbuj innych lokalizacji.", "error");
            }
        } catch (error) {
            console.error("Error during route search:", error);
            showNotification("Wystąpił błąd podczas wyszukiwania trasy.", "error");
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <div className="w-96 bg-white shadow-lg flex flex-col z-10">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
                                <Car className="w-8 h-8" />
                                TrafficWatch
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">Monitor ruchu & Analiza</p>
                        </div>
                        {isAuthenticated ? (
                            <button
                                onClick={onLogout}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Wyloguj się"
                            >
                                <LogOut className="w-5 h-5 text-gray-600" />
                            </button>
                        ) : (
                            <button
                                onClick={onLoginClick}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                            >
                                <LogIn className="w-4 h-4" />
                                Zaloguj
                            </button>
                        )}
                    </div>

                    {/* User Info */}
                    {isAuthenticated && user && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                                <User className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">{user.username}</p>
                                <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Route Planner Section */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800">
                            <Search className="w-5 h-5 text-blue-500" />
                            Zaplanuj Trasę
                        </h2>

                        {isAuthenticated && (
                            <button
                                onClick={() => {
                                    setIsPinMode(!isPinMode);
                                    if (!isPinMode) showNotification("Kliknij na mapie, aby dodać pinezkę.", "info");
                                }}
                                className={`w-full mb-4 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${isPinMode ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100'}`}
                            >
                                <MapPin className="w-4 h-4" />
                                {isPinMode ? 'Anuluj dodawanie pinezki' : 'Dodaj Pinezkę'}
                            </button>
                        )}

                        <form onSubmit={handleSearch} className="space-y-3 relative">
                            <div className="relative">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Z (Start)</label>
                                <input
                                    type="text"
                                    placeholder="np. Podwisłocze 30"
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                                    value={fromLocation}
                                    onChange={(e) => handleLocationInput(e.target.value, setFromLocation, setFromSuggestions, setShowFromSuggestions, setFromCoords)}
                                    onFocus={() => fromLocation && setShowFromSuggestions(true)}
                                />
                                {showFromSuggestions && fromSuggestions.length > 0 && (
                                    <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                                        {fromSuggestions.map((loc, idx) => (
                                            <div
                                                key={idx}
                                                className={`p-2 cursor-pointer text-sm flex items-center gap-2 ${loc.isPin
                                                    ? 'bg-blue-50 hover:bg-blue-100 border-b border-blue-100'
                                                    : 'hover:bg-gray-50'
                                                    }`}
                                                onClick={() => selectLocation(loc, setFromLocation, setFromSuggestions, setShowFromSuggestions, setFromCoords)}
                                            >
                                                <MapPin className={`w-3 h-3 ${loc.isPin ? 'text-blue-600' : 'text-gray-400'}`} />
                                                {loc.display_name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="relative">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Do (Cel)</label>
                                <input
                                    type="text"
                                    placeholder="np. Powstańców Warszawy 12"
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                                    value={toLocation}
                                    onChange={(e) => handleLocationInput(e.target.value, setToLocation, setToSuggestions, setShowToSuggestions, setToCoords)}
                                    onFocus={() => toLocation && setShowToSuggestions(true)}
                                />
                                {showToSuggestions && toSuggestions.length > 0 && (
                                    <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                                        {toSuggestions.map((loc, idx) => (
                                            <div
                                                key={idx}
                                                className={`p-2 cursor-pointer text-sm flex items-center gap-2 ${loc.isPin
                                                    ? 'bg-blue-50 hover:bg-blue-100 border-b border-blue-100'
                                                    : 'hover:bg-gray-50'
                                                    }`}
                                                onClick={() => selectLocation(loc, setToLocation, setToSuggestions, setShowToSuggestions, setToCoords)}
                                            >
                                                <MapPin className={`w-3 h-3 ${loc.isPin ? 'text-blue-600' : 'text-gray-400'}`} />
                                                {loc.display_name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="relative">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Data i czas wyjazdu (opcjonalnie)</label>
                                <input
                                    type="datetime-local"
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                                    value={tripTime}
                                    onChange={(e) => setTripTime(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSearching}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {isSearching ? 'Szukanie...' : 'Szukaj Trasy'}
                            </button>
                        </form>

                        {/* Search Results */}
                        {searchResult && (
                            <div className="mt-4 space-y-3 pt-4 border-t border-gray-100">
                                {searchResult.car && (
                                    <div
                                        onClick={() => handleRouteCardClick('car')}
                                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${activeRouteMode === 'car' ? 'bg-blue-100 border-blue-300 shadow-md' : 'bg-blue-50 border-blue-100 hover:bg-blue-100'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-500 rounded-full text-white">
                                                <Car className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">Samochód</p>
                                                <p className="text-xs text-gray-500">{searchResult.car.distance}</p>
                                                {searchResult.car.trafficDelay > 0 && (
                                                    <div className="mt-1">
                                                        <p className={`text-xs font-semibold ${searchResult.car.trafficLevel === 'high' ? 'text-red-600' :
                                                            searchResult.car.trafficLevel === 'medium' ? 'text-orange-600' : 'text-green-600'
                                                            }`}>
                                                            +{Math.round(searchResult.car.trafficDelay / 60)} min korków
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 mt-0.5">
                                                            {tripTime ? '*Symulacja historyczna/przyszła' : '*Dane w czasie rzeczywistym (TomTom)'}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-lg font-bold text-blue-700">{searchResult.car.time}</span>
                                        {isAuthenticated && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); saveRoute('car'); }}
                                                className="ml-3 p-2 hover:bg-blue-200 rounded-full transition-colors text-blue-600"
                                                title="Zapisz trasę"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                )}

                                {searchResult.bike && (
                                    <div
                                        onClick={() => handleRouteCardClick('bike')}
                                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${activeRouteMode === 'bike' ? 'bg-green-100 border-green-300 shadow-md' : 'bg-green-50 border-green-100 hover:bg-green-100'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-green-500 rounded-full text-white">
                                                <Bike className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">Rower</p>
                                                <p className="text-xs text-gray-500">{searchResult.bike.distance}</p>
                                            </div>
                                        </div>
                                        <span className="text-lg font-bold text-green-700">{searchResult.bike.time}</span>
                                        {isAuthenticated && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); saveRoute('bike'); }}
                                                className="ml-3 p-2 hover:bg-green-200 rounded-full transition-colors text-green-600"
                                                title="Zapisz trasę"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                )}

                                {searchResult.walk && (
                                    <div
                                        onClick={() => handleRouteCardClick('walk')}
                                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${activeRouteMode === 'walk' ? 'bg-orange-100 border-orange-300 shadow-md' : 'bg-orange-50 border-orange-100 hover:bg-orange-100'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-orange-500 rounded-full text-white">
                                                <Footprints className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">Pieszo</p>
                                                <p className="text-xs text-gray-500">{searchResult.walk.distance}</p>
                                            </div>
                                        </div>
                                        <span className="text-lg font-bold text-orange-700">{searchResult.walk.time}</span>
                                        {isAuthenticated && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); saveRoute('walk'); }}
                                                className="ml-3 p-2 hover:bg-orange-200 rounded-full transition-colors text-orange-600"
                                                title="Zapisz trasę"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                )}

                                {searchResult.transit && (
                                    <div
                                        onClick={() => handleRouteCardClick('transit')}
                                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${activeRouteMode === 'transit' ? 'bg-purple-100 border-purple-300 shadow-md' : 'bg-purple-50 border-purple-100 hover:bg-purple-100'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-purple-500 rounded-full text-white">
                                                <Bus className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">Komunikacja</p>
                                                <p className="text-xs text-gray-500">{searchResult.transit.distance || 'MPK Rzeszów'}</p>
                                            </div>
                                        </div>
                                        <span className="text-lg font-bold text-purple-700">{searchResult.transit.time}</span>
                                        {isAuthenticated && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); saveRoute('transit'); }}
                                                className="ml-3 p-2 hover:bg-purple-200 rounded-full transition-colors text-purple-600"
                                                title="Zapisz trasę"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Transit Connection Details */}
                                {searchResult.transit && searchResult.transit.connections && (
                                    <TransitResults
                                        connections={searchResult.transit.connections}
                                        onConnectionClick={(connection) => {
                                            console.log('Selected connection:', connection);
                                            showNotification(`Wybrano linię ${connection.route_number}`, 'info');
                                        }}
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    {/* Saved Routes Section */}
                    <div className="border-t border-gray-200 pt-4">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800">
                            <Navigation className="w-5 h-5 text-gray-600" />
                            Twoje Trasy
                        </h2>
                        {isAuthenticated ? (
                            <div className="space-y-3">
                                {routes.map(route => (
                                    <div
                                        key={route.id}
                                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${selectedRoute?.id === route.id ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                                        onClick={() => handleSavedRouteClick(route)}
                                    >
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-medium text-gray-900">{route.name}</h3>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={(e) => editRouteMode(route, e)}
                                                    className="text-gray-400 hover:text-green-500 transition-colors p-1"
                                                    title="Zmień tryb transportu"
                                                >
                                                    <span className="text-base">{route.transport_mode === 'car' ? '🚗' : route.transport_mode === 'bike' ? '🚴' : '🚶'}</span>
                                                </button>
                                                <button
                                                    onClick={(e) => renameRoute(route, e)}
                                                    className="text-gray-400 hover:text-blue-500 transition-colors p-1"
                                                    title="Zmień nazwę"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => deleteRoute(route.id, e)}
                                                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                    title="Usuń trasę"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-sm text-gray-600 mt-2">
                                            <span>{route.origin} → {route.destination}</span>
                                            <span className="font-bold text-green-600">{route.time}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
                                <p className="text-sm text-gray-600 mb-3">Zaloguj się, aby zapisać i przeglądać swoje ulubione trasy.</p>
                                <button
                                    onClick={onLoginClick}
                                    className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                                >
                                    Zaloguj się teraz
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Pins Section */}
                    <div className="border-t border-gray-200 pt-4">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800">
                            <MapPin className="w-5 h-5 text-gray-600" />
                            Moje Pinezki
                        </h2>
                        {isAuthenticated ? (
                            <div className="space-y-2">
                                {pins.length > 0 ? (
                                    pins.map(pin => (
                                        <div
                                            key={pin.id}
                                            className="p-3 rounded-lg border bg-gray-50 border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors"
                                            onClick={() => handlePinClick(pin)}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-2 flex-1">
                                                    <div
                                                        className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0"
                                                        style={{ backgroundColor: pin.color || 'blue' }}
                                                    />
                                                    <h3 className="font-medium text-gray-900 text-sm">{pin.name}</h3>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            editPin(pin);
                                                        }}
                                                        className="text-gray-400 hover:text-blue-500 transition-colors p-1"
                                                        title="Edytuj pinezkę"
                                                    >
                                                        <Edit2 className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deletePin(pin.id);
                                                        }}
                                                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                        title="Usuń pinezkę"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                            {pin.note && (
                                                <p className="text-xs text-gray-600 mt-1 ml-5">{pin.note}</p>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-500 text-center py-4">Brak zapisanych pinezek</p>
                                )}
                            </div>
                        ) : (
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
                                <p className="text-sm text-gray-600 mb-3">Zaloguj się, aby zapisać i przeglądać swoje pinezki.</p>
                                <button
                                    onClick={onLoginClick}
                                    className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                                >
                                    Zaloguj się teraz
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800">
                            <BarChart3 className="w-5 h-5 text-gray-600" />
                            Statystyki
                        </h2>

                        {/* Traffic Analysis */}
                        <div className="space-y-3 mb-4">
                            <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-lg border border-orange-200">
                                <p className="text-xs font-medium text-gray-600 mb-2">📊 Analiza korków w Rzeszowie</p>
                                <p className="text-sm font-semibold text-gray-700 mb-3">Najgorsze godziny (dni robocze):</p>
                                <div className="space-y-2">
                                    {calculateTrafficStats().map((peak, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-xs">
                                            <span className="text-gray-700">
                                                {idx + 1}. {peak.hour}:00 - {peak.hour + 1}:00
                                            </span>
                                            <span className={`font-bold ${peak.level === 'high' ? 'text-red-600' : 'text-orange-600'
                                                }`}>
                                                +{Math.round(peak.delay)}% czasu
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[10px] text-gray-500 mt-2">
                                    💡 Najlepszy czas: Niedziela rano (prawie puste drogi!)
                                </p>
                            </div>
                        </div>

                        {/* Top Routes */}
                        {isAuthenticated && routes.length > 0 && (
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                                <p className="text-xs font-medium text-gray-600 mb-2">🏆 Twoje najpopularniejsze trasy</p>
                                <div className="space-y-2">
                                    {getTopRoutes().length > 0 ? (
                                        getTopRoutes().map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-xs">
                                                <span className="text-gray-700 flex-1 truncate">
                                                    {idx + 1}. {item.route}
                                                </span>
                                                <span className="font-bold text-blue-600 ml-2">
                                                    {item.count}x
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-gray-500 text-center py-2">
                                            Zapisz więcej tras, aby zobaczyć statystyki
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Transport Mode Stats */}
                        {isAuthenticated && routes.length > 0 && (
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                <p className="text-xs font-medium text-gray-600 mb-3">🚗 Ulubiony środek transportu</p>
                                {(() => {
                                    const stats = getTransportModeStats();
                                    const modes = [
                                        { name: 'Samochód', icon: '🚗', percent: stats.car, color: 'bg-blue-500' },
                                        { name: 'Rower', icon: '🚴', percent: stats.bike, color: 'bg-green-500' },
                                        { name: 'Pieszo', icon: '🚶', percent: stats.walk, color: 'bg-orange-500' }
                                    ];
                                    const maxMode = modes.reduce((max, mode) => mode.percent > max.percent ? mode : max);

                                    return (
                                        <>
                                            <div className="space-y-2 mb-3">
                                                {modes.filter(m => m.percent > 0).map((mode, idx) => (
                                                    <div key={idx}>
                                                        <div className="flex justify-between text-xs mb-1">
                                                            <span className="text-gray-700">{mode.icon} {mode.name}</span>
                                                            <span className="font-bold text-gray-800">{mode.percent}%</span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                                            <div
                                                                className={`${mode.color} h-2 rounded-full transition-all`}
                                                                style={{ width: `${mode.percent}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-xs text-gray-600 text-center">
                                                Najczęściej wybierasz: <span className="font-bold">{maxMode.icon} {maxMode.name}</span>
                                            </p>
                                        </>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                </div >
            </div >

            {/* Main Content - Map */}
            < div className="flex-1 relative" >
                <MapComponent
                    routeCoords={routePath}
                    trafficSegments={trafficSegments}
                    onMapClick={handleMapClick}
                    clickedStart={clickedStart}
                    clickedDestination={clickedDestination}
                    pins={pins}
                    onPinDelete={deletePin}
                    onPinEdit={editPin}
                    center={mapCenter}
                    busStops={busStops}
                    showBusStops={showBusStops}
                />

                {/* Overlay Info */}
                <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-md z-[1000]">
                    <h3 className="font-semibold text-gray-800">Status Systemu</h3>
                    <div className="flex items-center gap-2 mt-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-sm text-gray-600">API: Połączono</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-sm text-gray-600">Model: Gotowy</span>
                    </div>
                </div>

                {/* Notifications and Modals */}
                {
                    notification && (
                        <Notification
                            message={notification.message}
                            type={notification.type}
                            onClose={() => setNotification(null)}
                        />
                    )
                }

                <Modal
                    isOpen={modal.isOpen}
                    onClose={closeModal}
                    onConfirm={modal.onConfirm}
                    title={modal.title}
                    message={modal.message}
                    type={modal.type}
                    initialValue={modal.initialValue}
                    initialNote={modal.initialNote}
                    initialColor={modal.initialColor}
                    initialMode={modal.initialMode}
                />
            </div >
        </div >
    );
}

export default App;
