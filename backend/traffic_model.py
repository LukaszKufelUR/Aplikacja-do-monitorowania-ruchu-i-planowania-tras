from datetime import datetime
import math

def calculate_traffic_delay(base_duration_seconds: float) -> dict:
    """
    Calculates estimated traffic delay based on current time and typical congestion patterns.
    Returns a dictionary with delay in seconds and traffic level.
    """
    now = datetime.now()
    hour = now.hour + now.minute / 60.0
    day_of_week = now.weekday() # 0 = Monday, 6 = Sunday

    # Base congestion factor (1.0 = no traffic)
    congestion_factor = 1.0
    traffic_level = "low" # low, medium, high

    # Weekend logic (Saturday/Sunday)
    if day_of_week >= 5:
        # Weekends have milder peaks around noon
        if 11 <= hour <= 14:
            congestion_factor = 1.2 # 20% slower
            traffic_level = "medium"
        else:
            congestion_factor = 1.05 # 5% slower generally
    else:
        # Weekday logic
        
        # Morning Peak (7:00 - 9:30), peak at 8:00
        if 6.5 <= hour <= 10:
            # Gaussian-like curve for morning peak
            peak_intensity = math.exp(-((hour - 8.0) ** 2) / (2 * 0.8 ** 2))
            congestion_factor += peak_intensity * 0.6 # Up to 60% slower
            
            if peak_intensity > 0.5:
                traffic_level = "high"
            elif peak_intensity > 0.2:
                traffic_level = "medium"

        # Afternoon Peak (15:00 - 18:00), peak at 16:30
        elif 14.5 <= hour <= 18.5:
            # Gaussian-like curve for afternoon peak
            peak_intensity = math.exp(-((hour - 16.5) ** 2) / (2 * 1.0 ** 2))
            congestion_factor += peak_intensity * 0.7 # Up to 70% slower
            
            if peak_intensity > 0.5:
                traffic_level = "high"
            elif peak_intensity > 0.2:
                traffic_level = "medium"
        
        # Mid-day traffic (10:00 - 14:30)
        elif 10 < hour < 14.5:
            congestion_factor = 1.15 # 15% slower
            traffic_level = "medium"

    # Calculate delay
    total_duration = base_duration_seconds * congestion_factor
    delay_seconds = total_duration - base_duration_seconds

    return {
        "delay_seconds": int(delay_seconds),
        "total_duration_seconds": int(total_duration),
        "traffic_level": traffic_level,
        "congestion_factor": round(congestion_factor, 2)
    }
