from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from dotenv import load_dotenv
import models, schemas, database, auth
import traffic_service
import gtfs_service

load_dotenv()

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="TrafficWatch API", version="0.1.0")

@app.get("/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.now()}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Welcome to TrafficWatch API"}

@app.post("/auth/register", response_model=schemas.User)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/auth/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login user and return JWT token."""
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/me")
def get_current_user_info(current_user: models.User = Depends(auth.get_current_user)):
    """Get current authenticated user information."""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email
    }

@app.post("/routes/", response_model=schemas.Route)
def create_route(
    route: schemas.RouteCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new route (protected - requires authentication)."""
    db_route = models.Route(**route.dict(), user_id=current_user.id)
    db.add(db_route)
    db.commit()
    db.refresh(db_route)
    return db_route

@app.get("/routes/", response_model=List[schemas.Route])
def read_routes(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get all routes for the current user (protected - requires authentication)."""
    routes = db.query(models.Route).filter(models.Route.user_id == current_user.id).offset(skip).limit(limit).all()
    return routes

@app.delete("/routes/{route_id}")
def delete_route(
    route_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a route."""
    route = db.query(models.Route).filter(models.Route.id == route_id, models.Route.user_id == current_user.id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    db.delete(route)
    db.commit()
    return {"message": "Route deleted successfully"}

@app.put("/routes/{route_id}", response_model=schemas.Route)
def update_route(
    route_id: int,
    route_update: schemas.RouteUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Update a route (e.g. rename)."""
    db_route = db.query(models.Route).filter(models.Route.id == route_id, models.Route.user_id == current_user.id).first()
    if not db_route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    db_route.name = route_update.name
    if route_update.transport_mode:
        db_route.transport_mode = route_update.transport_mode
    db.commit()
    db.refresh(db_route)
    return db_route

@app.post("/pins/", response_model=schemas.Pin)
def create_pin(
    pin: schemas.PinCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new pin."""
    db_pin = models.Pin(**pin.dict(), user_id=current_user.id)
    db.add(db_pin)
    db.commit()
    db.refresh(db_pin)
    return db_pin

@app.get("/pins/", response_model=List[schemas.Pin])
def read_pins(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get all pins for the current user."""
    pins = db.query(models.Pin).filter(models.Pin.user_id == current_user.id).offset(skip).limit(limit).all()
    return pins

@app.delete("/pins/{pin_id}")
def delete_pin(
    pin_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a pin."""
    pin = db.query(models.Pin).filter(models.Pin.id == pin_id, models.Pin.user_id == current_user.id).first()
    if not pin:
        raise HTTPException(status_code=404, detail="Pin not found")
    
    db.delete(pin)
    db.commit()
    return {"message": "Pin deleted successfully"}

@app.put("/pins/{pin_id}", response_model=schemas.Pin)
def update_pin(
    pin_id: int,
    pin: schemas.PinCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Update a pin."""
    db_pin = db.query(models.Pin).filter(models.Pin.id == pin_id, models.Pin.user_id == current_user.id).first()
    if not db_pin:
        raise HTTPException(status_code=404, detail="Pin not found")
    
    db_pin.name = pin.name
    db_pin.note = pin.note
    db_pin.color = pin.color
    db_pin.lat = pin.lat
    db_pin.lon = pin.lon
    
    db.commit()
    db.refresh(db_pin)
    return db_pin

@app.post("/traffic/flow")
async def get_traffic_flow(coordinates: List[List[float]], simulation_time: Optional[datetime] = None):
    """
    Get traffic flow data for route coordinates.
    Returns color-coded segments based on real-time traffic or simulation.
    
    Args:
        coordinates: List of [lon, lat] points
        simulation_time: Optional datetime for simulation (default: None = now)
    """
    try:
        use_simulation = False
        current_time = datetime.now()
        
        if simulation_time:
            time_diff = abs((simulation_time - current_time).total_seconds())
            if time_diff > 900:
                use_simulation = True
        
        traffic_points = []
        
        if not use_simulation:
            try:
                traffic_points = await traffic_service.get_traffic_flow_segments(coordinates)
                if not traffic_points:
                    use_simulation = True
            except Exception as e:
                print(f"TomTom API error: {e}")
                use_simulation = True

        if use_simulation:
            sim_time = simulation_time if simulation_time else current_time
            traffic_points = traffic_service.get_simulated_traffic(coordinates, sim_time)

        traffic_segments = traffic_service.interpolate_traffic_segments(coordinates, traffic_points)
        
        return {
            "segments": traffic_segments,
            "trafficPoints": traffic_points,
            "source": "simulation" if use_simulation else "tomtom"
        }
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"Error fetching traffic: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch traffic data")

@app.get("/transit/stops")
async def get_bus_stops():
    """Get all bus stops in Rzeszów"""
    try:
        stops = gtfs_service.gtfs_service.get_all_stops()
        return {"stops": stops, "count": len(stops)}
    except Exception as e:
        print(f"Error fetching bus stops: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch bus stops")

@app.get("/transit/stops/{stop_id}")
async def get_stop_details(stop_id: str):
    """Get details for a specific bus stop including routes that serve it"""
    try:
        stop = gtfs_service.gtfs_service.get_stop_by_id(stop_id)
        if not stop:
            raise HTTPException(status_code=404, detail="Stop not found")
        return stop
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching stop details: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch stop details")

@app.get("/transit/routes")
async def get_transit_routes():
    """Get all transit routes/lines"""
    try:
        routes = gtfs_service.gtfs_service.get_all_routes()
        return {"routes": routes, "count": len(routes)}
    except Exception as e:
        print(f"Error fetching routes: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch routes")

@app.post("/transit/plan")
async def plan_transit_route(request: schemas.TransitPlanRequest):
    """
    Find transit connections between two stops
    
    Args:
        request: Transit plan request with from_stop_id, to_stop_id, departure_time
    
    Returns:
        List of possible connections with route details
    """
    try:
        connections = gtfs_service.gtfs_service.find_connections(
            request.from_stop_id, 
            request.to_stop_id, 
            request.departure_time
        )
        return {"connections": connections, "count": len(connections)}
    except Exception as e:
        print(f"Error planning transit route: {e}")
        raise HTTPException(status_code=500, detail="Failed to plan transit route")

@app.get("/transit/routes/{route_id}/shape")
async def get_route_shape(route_id: str):
    """Get the geographic path and stops for a specific route/line"""
    try:
        shape = gtfs_service.gtfs_service.get_route_shape(route_id)
        if not shape:
            raise HTTPException(status_code=404, detail="Route not found")
        return shape
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching route shape: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch route shape")
