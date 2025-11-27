from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class RouteBase(BaseModel):
    name: str
    origin: str
    destination: str
    origin_lat: Optional[float] = None
    origin_lon: Optional[float] = None
    dest_lat: Optional[float] = None
    dest_lon: Optional[float] = None
    geometry_json: Optional[str] = None
    transport_mode: Optional[str] = "car"

class RouteCreate(RouteBase):
    pass

class RouteUpdate(BaseModel):
    name: str
    transport_mode: Optional[str] = None

class Route(RouteBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    username: str
    email: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int

    class Config:
        from_attributes = True

class TrafficDataBase(BaseModel):
    location: str
    traffic_level: float
    speed: float

class TrafficDataCreate(TrafficDataBase):
    pass

class TrafficData(TrafficDataBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True

# Authentication Schemas
class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: str | None = None

class PinBase(BaseModel):
    name: str
    note: Optional[str] = None
    color: Optional[str] = "blue"
    lat: float
    lon: float

class PinCreate(PinBase):
    pass

class Pin(PinBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

# Transit Schemas
class TransitPlanRequest(BaseModel):
    from_stop_id: str
    to_stop_id: str
    departure_time: Optional[datetime] = None
