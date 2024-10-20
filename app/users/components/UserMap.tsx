'use client';
import { useEffect, useState, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { motion } from 'framer-motion';


mapboxgl.accessToken = 'pk.eyJ1IjoiZGVqYW5mZXRvdnNraSIsImEiOiJjbTJkaWd5c3IxZHpkMmpyMnFoNmM5Mnh4In0.G7TWLfvTgQtdtROdDQJFcQ';

interface OnChainData {
    transactionHash: string;
    timestamp: string;
    blockNumber: number;
    vppScanUrl: string;
}

interface Charger {
    id: string;
    manufacturer: string;
    model: string;
    energyCapacity: string;
    status: string;
    firmwareVersion: string;
    softwareVersion: string;
    connectorType: string;
    location: {
        latitude: number;
        longitude: number;
        zipCode: string;
        country?: string; // Add country field if needed for filtering by country
    };
    onChainData: OnChainData;
}

const UserMap = () => {
    const [chargers, setChargers] = useState<Charger[]>([]);
    const [filteredChargers, setFilteredChargers] = useState<Charger[]>([]);
    const [map, setMap] = useState<mapboxgl.Map | null>(null);
    const [selectedCharger, setSelectedCharger] = useState<Charger | null>(null);
    const [chargeAmount, setChargeAmount] = useState('');
    const [deviceInfo, setDeviceInfo] = useState({
        deviceName: '',
        deviceType: '',
        batteryCapacity: '',
    });
    const [markers, setMarkers] = useState<mapboxgl.Marker[]>([]);
    const [search, setSearch] = useState({
        capacity: '',
        location: '',
        status: '',
    });
    const detailsRef = useRef<HTMLDivElement | null>(null);

    // Fetch chargers from API
    useEffect(() => {
        const fetchChargers = async () => {
            try {
                const response = await fetch('/api/devices');
                const data = await response.json();
                setChargers(data);
                setFilteredChargers(data); // Initialize filtered chargers to show all chargers initially
            } catch (error) {
                console.error('Error fetching chargers:', error);
            }
        };

        fetchChargers();

        if (!map) {
            const mapboxMap = new mapboxgl.Map({
                container: 'map',
                center: [0, 0],
                zoom: 2,
            });

            mapboxMap.on('load', () => {
                setMap(mapboxMap);
            });
        }

        return () => {
            if (map) {
                map.remove();
            }
        };
    }, [map]);

    const handleZoomIn = () => {
        if (map) map.zoomIn();
    };

    const handleZoomOut = () => {
        if (map) map.zoomOut();
    };
    
    // Function to add markers to the map
    const addMarkersToMap = (chargersToShow: Charger[]) => {
        if (map) {
            markers.forEach(marker => marker.remove());
            setMarkers([]);

            chargersToShow.forEach(charger => {
                const markerElement = document.createElement('div');
                markerElement.className = 'custom-marker';

                markerElement.style.backgroundColor = '#ff4e42';
                markerElement.style.width = '20px';
                markerElement.style.height = '20px';
                markerElement.style.borderRadius = '50%';
                markerElement.style.border = '2px solid white';
                markerElement.style.cursor = 'pointer';

                const marker = new mapboxgl.Marker({ element: markerElement })
                    .setLngLat([charger.location.longitude, charger.location.latitude])
                    .addTo(map);

                marker.getElement().addEventListener('click', () => {
                    setSelectedCharger(charger);
                });

                setMarkers(prev => [...prev, marker]);
            });
        }
    };

    // Add markers when chargers are ready
    useEffect(() => {
        if (map && filteredChargers.length > 0) {
            addMarkersToMap(filteredChargers);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, filteredChargers]);

    // Handle form submission for charging
    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (selectedCharger && selectedCharger.status === 'Available') {
            console.log('Charging amount:', chargeAmount);
            console.log('Device info:', deviceInfo);
        } else {
            alert('This charger is not available for connection.');
        }
    };

    // Close UI when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
        if (detailsRef.current && !detailsRef.current.contains(e.target as Node)) {
            setSelectedCharger(null);
        }
    };

    // Add event listener for outside clicks
    useEffect(() => {
        if (selectedCharger) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [selectedCharger]);

    // Handle filtering logic based on search input
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setSearch(prev => ({ ...prev, [name]: value }));

        const filtered = chargers.filter(charger => {
            const matchesCapacity = !search.capacity || charger.energyCapacity.includes(search.capacity);
            const matchesLocation = !search.location || charger.location.zipCode.includes(search.location);
            const matchesStatus = !search.status || charger.status.includes(search.status);

            return matchesCapacity && matchesLocation && matchesStatus;
        });

        setFilteredChargers(filtered);
    };

    // Function to close UI using the close button
    const handleClose = () => {
        setSelectedCharger(null);
    };

    return (
        <div className="relative h-screen w-full">
            <div id="map" className="absolute inset-0 w-full h-full" />

            {/* Zoom control buttons */}
            <div className="absolute bottom-5 right-10 bottom-5 flex space-x-4 bg-white bg-opacity-80 backdrop-blur-md rounded-full">
                <button
                    className="bg-transparent text-blue-500 p-2 rounded-full shadow-md transition-all text-2xl hover:text-blue-700"
                    onClick={handleZoomIn}
                >
                    +
                </button>

                <button
                    className="bg-transparent text-blue-500 p-2 rounded-full shadow-md transition-all text-2xl hover:text-blue-700"
                    onClick={handleZoomOut}
                >
                    -
                </button>
            </div>

            {selectedCharger && (
                <>
                    {/* Background overlay */}
                    <motion.div
                        className="absolute inset-0 bg-black bg-opacity-30"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />

                    {/* Charger details card */}
                    <motion.div
                        ref={detailsRef}
                        initial={{ opacity: 0, x: '100%' }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: '100%' }}
                        transition={{ duration: 0.5 }}
                        className="absolute top-8 right-8 w-full max-w-md bg-white bg-opacity-70 backdrop-blur-md border border-gray-200 shadow-lg rounded-lg p-6 space-y-6"
                    >
                        <button
                            onClick={handleClose}
                            className="absolute top-2 right-2 text-gray-700 hover:text-gray-900 font-bold text-2xl"
                        >
                            &times;
                        </button>
                        <h2 className="text-3xl font-bold text-blue-500">Charger Details</h2>
                        <div className="p-4 shadow-sm bg-white bg-opacity-60 rounded-lg space-y-2">
                            <p className="font-semibold text-gray-900">
                                <strong>Manufacturer:</strong> {selectedCharger.manufacturer}
                            </p>
                            <p className="font-semibold text-gray-900">
                                <strong>Model:</strong> {selectedCharger.model}
                            </p>
                            <p className="text-gray-600">
                                <strong>Status:</strong> {selectedCharger.status}
                            </p>
                            <p className="text-gray-600">
                                <strong>Energy Capacity:</strong> {selectedCharger.energyCapacity}
                            </p>
                            <p className="text-gray-600">
                                <strong>Connector Type:</strong> {selectedCharger.connectorType}
                            </p>
                            <p className="text-gray-600">
                                <strong>Location:</strong> {selectedCharger.location.zipCode} ({selectedCharger.location.latitude}, {selectedCharger.location.longitude})
                            </p>
                        </div>

                        {selectedCharger.status === 'Available' ? (
                            <>
                                <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
                                    <div>
                                        <label htmlFor="chargeAmount" className="block font-medium text-gray-700">Charge Amount (kWh):</label>
                                        <input
                                            id="chargeAmount"
                                            type="number"
                                            placeholder="Enter amount"
                                            value={chargeAmount}
                                            onChange={(e) => setChargeAmount(e.target.value)}
                                            className="mt-1 w-full px-3 py-2 bg-white bg-opacity-50 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="deviceName" className="block font-medium text-gray-700">Device Name:</label>
                                        <input
                                            id="deviceName"
                                            type="text"
                                            placeholder="Enter your device name"
                                            value={deviceInfo.deviceName}
                                            onChange={(e) => setDeviceInfo({ ...deviceInfo, deviceName: e.target.value })}
                                            className="mt-1 w-full px-3 py-2 bg-white bg-opacity-50 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="deviceType" className="block font-medium text-gray-700">Device Type:</label>
                                        <input
                                            id="deviceType"
                                            type="text"
                                            placeholder="Enter device type"
                                            value={deviceInfo.deviceType}
                                            onChange={(e) => setDeviceInfo({ ...deviceInfo, deviceType: e.target.value })}
                                            className="mt-1 w-full px-3 py-2 bg-white bg-opacity-50 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg shadow hover:bg-blue-600 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        Connect
                                    </button>
                                </form>
                            </>
                        ) : (
                            <button className="w-full bg-gray-300 text-gray-500 py-2 px-4 rounded-lg cursor-not-allowed" disabled>Not Available</button>
                        )}
                    </motion.div>
                </>
            )}

            {/* Search UI */}
            <div className="absolute top-8 left-8 w-full max-w-sm bg-white bg-opacity-80 p-6 shadow-md rounded-lg space-y-4">
                <h3 className="text-2xl font-semibold text-gray-800">Search Chargers</h3>
                <div>
                    <label htmlFor="capacity" className="block font-medium text-gray-700">Capacity</label>
                    <input
                        id="capacity"
                        name="capacity"
                        type="text"
                        placeholder="Enter capacity"
                        value={search.capacity}
                        onChange={handleSearchChange}
                        className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label htmlFor="location" className="block font-medium text-gray-700">Location (Zip Code)</label>
                    <input
                        id="location"
                        name="location"
                        type="text"
                        placeholder="Enter zip code"
                        value={search.location}
                        onChange={handleSearchChange}
                        className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label htmlFor="status" className="block font-medium text-gray-700">Status</label>
                    <select
                        id="status"
                        name="status"
                        value={search.status}
                        onChange={handleSearchChange}
                        className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All</option>
                        <option value="Available">Available</option>
                        <option value="Charging">Charging</option>
                    </select>
                </div>

                {/* Charger List UI */}
                <ul className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                    {filteredChargers.map((charger) => (
                        <li key={charger.id} className="bg-white p-2 rounded-lg shadow hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedCharger(charger)}>
                            <h4 className="text-lg font-semibold text-blue-500">{charger.manufacturer} - {charger.model}</h4>
                            <p className="text-gray-600">Capacity: {charger.energyCapacity}</p>
                            <p className="text-gray-600">Status: {charger.status}</p>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default UserMap;
