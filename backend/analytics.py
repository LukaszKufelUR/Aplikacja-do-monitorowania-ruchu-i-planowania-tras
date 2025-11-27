import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
import joblib
from datetime import datetime

class TrafficPredictor:
    def __init__(self):
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.is_trained = False

    def train_model(self, data: pd.DataFrame):
        """
        Trenuje model na podstawie danych historycznych.
        Oczekuje kolumn: 'hour', 'day_of_week', 'is_holiday', 'traffic_level'
        """
        if data.empty:
            print("Brak danych do trenowania.")
            return

        X = data[['hour', 'day_of_week', 'is_holiday']]
        y = data['traffic_level']
        
        self.model.fit(X, y)
        self.is_trained = True
        print("Model wytrenowany pomyślnie.")

    def predict_traffic(self, timestamp: datetime) -> float:
        """
        Przewiduje poziom ruchu (0.0 - 1.0) dla zadanego czasu.
        """
        if not self.is_trained:
            # Fallback: prosta heurystyka jeśli model nie jest wytrenowany
            hour = timestamp.hour
            if 7 <= hour <= 9 or 16 <= hour <= 18:
                return 0.8 # Godziny szczytu
            return 0.3

        hour = timestamp.hour
        day_of_week = timestamp.weekday()
        is_holiday = 0 # TODO: Integracja z kalendarzem świąt

        prediction = self.model.predict([[hour, day_of_week, is_holiday]])
        return max(0.0, min(1.0, prediction[0]))

    def save_model(self, path="traffic_model.pkl"):
        joblib.dump(self.model, path)

    def load_model(self, path="traffic_model.pkl"):
        try:
            self.model = joblib.load(path)
            self.is_trained = True
        except FileNotFoundError:
            print("Nie znaleziono zapisanego modelu.")

traffic_predictor = TrafficPredictor()
