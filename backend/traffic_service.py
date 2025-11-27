import os
import httpx
from typing import List, Dict, Tuple
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

TOMTOM_API_KEY = os.getenv("TOMTOM_API_KEY", "")

async def get_traffic_flow_segments(coordinates: List[List[float]], zoom: int = 10) -> List[Dict]:
    """
    Fetch traffic flow data for route segments from TomTom Traffic Flow API.
    
    Args:
        coordinates: List of [lon, lat] coordinate pairs representing the route
        zoom: Zoom level (10-22, higher = more detailed)
    
    Returns:
        List of segments with traffic data including color coding
    """
    if not TOMTOM_API_KEY:
        raise ValueError("TOMTOM_API_KEY not configured")
    
    segments = []
    
    sampled_coords = sample_coordinates(coordinates, max_points=20)
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        for i, coord in enumerate(sampled_coords):
            lon, lat = coord[0], coord[1]
            
            url = f"https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/{zoom}/json"
            params = {
                "key": TOMTOM_API_KEY,
                "point": f"{lat},{lon}",
                "unit": "KMPH"
            }
            
            try:
                response = await client.get(url, params=params)
                if response.status_code == 200:
                    data = response.json()
                    
                    flow_data = data.get("flowSegmentData", {})
                    current_speed = flow_data.get("currentSpeed", 0)
                    free_flow_speed = flow_data.get("freeFlowSpeed", 1)
                    confidence = flow_data.get("confidence", 0.5)
                    
                    speed_ratio = current_speed / free_flow_speed if free_flow_speed > 0 else 1.0
                    color = get_traffic_color(speed_ratio)
                    
                    segments.append({
                        "index": i,
                        "lat": lat,
                        "lon": lon,
                        "currentSpeed": current_speed,
                        "freeFlowSpeed": free_flow_speed,
                        "speedRatio": speed_ratio,
                        "color": color,
                        "confidence": confidence
                    })
                    
            except Exception as e:
                print(f"Error fetching traffic: {e}")
                segments.append({
                    "index": i,
                    "lat": lat,
                    "lon": lon,
                    "color": "green",
                    "speedRatio": 1.0,
                    "confidence": 0.0
                })
    
    return segments


def get_simulated_traffic(coordinates: List[List[float]], simulation_time: datetime) -> List[Dict]:
    """
    Generate simulated traffic data based on time of day and day of week.
    
    Args:
        coordinates: List of [lon, lat] coordinate pairs
        simulation_time: The datetime to simulate traffic for
        
    Returns:
        List of segments with simulated traffic data
    """
    segments = []
    sampled_coords = sample_coordinates(coordinates, max_points=20)
    congestion_factor = calculate_congestion_factor(simulation_time)
    
    import random
    
    for i, coord in enumerate(sampled_coords):
        lon, lat = coord[0], coord[1]
        random_variation = (random.random() * 0.3) - 0.15
        segment_congestion = max(0.0, min(1.0, congestion_factor + random_variation))
        speed_ratio = 1.0 - (segment_congestion * 0.8)
        color = get_traffic_color(speed_ratio)

        segments.append({
            "index": i,
            "lat": lat,
            "lon": lon,
            "currentSpeed": 50 * speed_ratio,
            "freeFlowSpeed": 50,
            "speedRatio": speed_ratio,
            "color": color,
            "confidence": 1.0,
            "source": "simulation"
        })
        
    return segments


def calculate_congestion_factor(sim_time: datetime) -> float:
    """
    Calculate a congestion factor (0.0 to 1.0) based on time and day.
    0.0 = No traffic
    1.0 = Heavy traffic
    """
    hour = sim_time.hour
    minute = sim_time.minute
    weekday = sim_time.weekday()
    congestion = 0.0
    
    if weekday >= 5:
        if 11 <= hour <= 14:
            congestion = 0.3
        elif 10 <= hour <= 18:
            congestion = 0.15
        return congestion

    current_hour_float = hour + (minute / 60.0)
    
    if 7 <= current_hour_float <= 9:
        if 7.5 <= current_hour_float <= 8.5:
            congestion = 0.8
        else:
            congestion = 0.6
    elif 15.5 <= current_hour_float <= 17.5:
        if 16 <= current_hour_float <= 17:
            congestion = 0.85
        else:
            congestion = 0.65
    elif 10 <= current_hour_float <= 14:
        congestion = 0.2
    elif 18 <= current_hour_float <= 20:
        congestion = 0.15
    
    return congestion


def sample_coordinates(coordinates: List[List[float]], max_points: int = 20) -> List[List[float]]:
    """
    Sample coordinates from route to reduce API calls.
    Takes evenly spaced points along the route.
    """
    if len(coordinates) <= max_points:
        return coordinates
    
    step = len(coordinates) // max_points
    return [coordinates[i] for i in range(0, len(coordinates), step)]


def get_traffic_color(speed_ratio: float) -> str:
    """
    Determine traffic color based on current speed vs free flow speed ratio.
    
    Args:
        speed_ratio: current_speed / free_flow_speed
    
    Returns:
        Color string: 'green', 'yellow', 'orange', or 'red'
    """
    if speed_ratio >= 0.8:
        return "green"
    elif speed_ratio >= 0.6:
        return "yellow"
    elif speed_ratio >= 0.4:
        return "orange"
    else:
        return "red"


def interpolate_traffic_segments(
    route_coords: List[List[float]], 
    traffic_points: List[Dict]
) -> List[Dict]:
    """
    Interpolate traffic data across all route segments.
    
    Args:
        route_coords: All route coordinates [lon, lat]
        traffic_points: Traffic data from sampled points
    
    Returns:
        List of route segments with interpolated colors
    """
    if not traffic_points:
        return [{"coords": route_coords, "color": "green"}]
    
    segments = []
    current_segment = {"coords": [], "color": "green"}
    
    for i, coord in enumerate(route_coords):
        # Find nearest traffic point
        nearest_traffic = find_nearest_traffic_point(coord, traffic_points)
        color = nearest_traffic["color"] if nearest_traffic else "green"
        
        if current_segment["color"] == color:
            current_segment["coords"].append(coord)
        else:
            if current_segment["coords"]:
                current_segment["coords"].append(coord)
                segments.append(current_segment)
                current_segment = {"coords": [coord], "color": color}
            else:
                current_segment = {"coords": [coord], "color": color}
    
    if current_segment["coords"]:
        segments.append(current_segment)
    
    return segments


def find_nearest_traffic_point(coord: List[float], traffic_points: List[Dict]) -> Dict:
    """Find the nearest traffic point to a given coordinate."""
    if not traffic_points:
        return None
    
    min_dist = float('inf')
    nearest = traffic_points[0]
    
    for point in traffic_points:
        dist = ((coord[0] - point["lon"])**2 + (coord[1] - point["lat"])**2)**0.5
        if dist < min_dist:
            min_dist = dist
            nearest = point
    
    return nearest
