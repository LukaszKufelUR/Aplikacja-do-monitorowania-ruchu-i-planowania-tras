from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    email = Column(String(100), unique=True, index=True)
    hashed_password = Column(String(255))

    routes = relationship("Route", back_populates="owner")
    pins = relationship("Pin", back_populates="owner")

class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), index=True)
    origin = Column(String(255))
    destination = Column(String(255))
    origin_lat = Column(Float, nullable=True)
    origin_lon = Column(Float, nullable=True)
    dest_lat = Column(Float, nullable=True)
    dest_lon = Column(Float, nullable=True)
    geometry_json = Column(String(10000), nullable=True)  # Store route geometry as JSON string
    transport_mode = Column(String(20), default="car")  # car, bike, or walk
    user_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="routes")

class Pin(Base):
    __tablename__ = "pins"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), index=True)
    note = Column(String(255), nullable=True)
    color = Column(String(20), default="blue")
    lat = Column(Float)
    lon = Column(Float)
    user_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="pins")

class TrafficData(Base):
    __tablename__ = "traffic_data"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    location = Column(String(255)) # "lat,lon"
    traffic_level = Column(Float) # 0.0 - 1.0 (0 - brak ruchu, 1 - korek)
    speed = Column(Float) # km/h
