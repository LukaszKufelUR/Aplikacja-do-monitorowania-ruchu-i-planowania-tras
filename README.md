# 🚦 TrafficWatch

> **Inteligentny system monitorowania ruchu drogowego i planowania tras dla miasta Rzeszów**

TrafficWatch to zaawansowana aplikacja webowa łącząca analizę ruchu drogowego w czasie rzeczywistym z funkcjami planowania tras i komunikacji miejskiej. Projekt został stworzony jako część pracy inżynierskiej z zakresu informatyki i ekonometrii.

---

## ✨ Funkcje

### 🗺️ Planowanie Tras
- **Wielomodalne planowanie** - samochód, rower, pieszo
- **Routing w czasie rzeczywistym** wykorzystujący GraphHopper API
- **Dokładne odległości i czasy przejazdu** dla każdego środka transportu
- **Wizualizacja tras** na interaktywnej mapie (Leaflet)

### 🚦 Monitoring Ruchu
- **Dane w czasie rzeczywistym** z TomTom Traffic API
- **Symulacja ruchu** oparta na wzorcach czasowych (godziny szczytu, dni tygodnia)
- **Kolorowe kodowanie natężenia ruchu** (zielony → żółty → pomarańczowy → czerwony)
- **Predykcja korków** na podstawie danych historycznych

### 🚌 Integracja z MPK Rzeszów
- **Przystanki autobusowe** z danymi GTFS
- **Planowanie podróży komunikacją miejską**
- **Rozkłady jazdy** i informacje o liniach
- **Wizualizacja tras autobusowych**

### 👤 System Użytkowników
- **Rejestracja i logowanie** z JWT authentication
- **Zapisywanie ulubionych tras**
- **Pinezki** - oznaczanie ważnych miejsc na mapie
- **Statystyki użytkowania** - najczęściej planowane trasy, preferowany środek transportu

### 📊 Analityka
- **Analiza natężenia ruchu** w różnych godzinach
- **Wykres dzienny** pokazujący najgorsze godziny
- **Top 3 najczęściej planowanych tras**
- **Preferowany środek transportu** użytkownika

---

## 🛠️ Technologie

### Backend
- **FastAPI** - nowoczesny framework Python do budowy API
- **SQLAlchemy** - ORM do zarządzania bazą danych
- **SQLite** - baza danych
- **JWT** - autoryzacja użytkowników
- **Bcrypt** - hashowanie haseł
- **HTTPX** - asynchroniczne zapytania HTTP

### Frontend
- **React 18** - biblioteka UI
- **Vite** - szybki bundler
- **Leaflet & React-Leaflet** - interaktywne mapy
- **TailwindCSS** - stylowanie
- **Axios** - komunikacja z API
- **Lucide React** - ikony

### Zewnętrzne API
- **GraphHopper** - routing drogowy
- **TomTom Traffic API** - dane o ruchu w czasie rzeczywistym
- **Nominatim (OpenStreetMap)** - geokodowanie adresów
- **GTFS** - dane komunikacji miejskiej

---

## 📋 Wymagania Wstępne

Przed uruchomieniem projektu upewnij się, że masz zainstalowane:

- **Python 3.9+** - [Pobierz tutaj](https://www.python.org/downloads/)
- **Node.js 18+** - [Pobierz tutaj](https://nodejs.org/)
- **Git** - [Pobierz tutaj](https://git-scm.com/)

---

## 🚀 Instalacja i Uruchomienie

### 1️⃣ Sklonuj repozytorium

```bash
git clone https://github.com/twoj-username/trafficwatch.git
cd trafficwatch
```

### 2️⃣ Konfiguracja Backend

```bash
cd backend
```

**Zainstaluj zależności:**
```bash
pip install -r requirements.txt
```

**Utwórz plik `.env` w katalogu `backend/`:**
```env
TOMTOM_API_KEY=twoj_klucz_api_tomtom
SECRET_KEY=twoj_tajny_klucz_jwt
```

> 💡 **Jak uzyskać klucz TomTom API:**
> 1. Zarejestruj się na [TomTom Developer Portal](https://developer.tomtom.com/)
> 2. Utwórz nowy projekt i skopiuj klucz API
> 3. Wklej go do pliku `.env`

**Uruchom serwer:**
```bash
uvicorn main:app --reload
```

✅ Backend działa na: `http://127.0.0.1:8000`  
📚 Dokumentacja API: `http://127.0.0.1:8000/docs`

### 3️⃣ Konfiguracja Frontend

Otwórz **nowy terminal** (zostaw backend uruchomiony):

```bash
cd frontend
```

**Zainstaluj zależności:**
```bash
npm install
```

> **⚠️ Uwaga dla Windows (PowerShell):**  
> Jeśli wystąpi błąd `PSSecurityException`, wykonaj:
> ```powershell
> Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
> ```

**Uruchom aplikację:**
```bash
npm run dev
```

✅ Frontend działa na: `http://localhost:5173`

---

## 📖 Jak Korzystać

### Rejestracja i Logowanie
1. Otwórz aplikację w przeglądarce
2. Kliknij **"Zarejestruj się"**
3. Podaj email, nazwę użytkownika i hasło
4. Zaloguj się swoimi danymi

### Planowanie Trasy
1. W polu **"Z (Start)"** wpisz adres początkowy (np. "Podwisłocze 30, Rzeszów")
2. Wybierz adres z listy podpowiedzi
3. W polu **"Do (Cel)"** wpisz adres docelowy (np. "Rynek 1, Rzeszów")
4. Wybierz **środek transportu** (🚗 samochód / 🚴 rower / 🚶 pieszo)
5. Kliknij **"Szukaj Trasy"**
6. Trasa pojawi się na mapie z informacjami o odległości i czasie

### Monitoring Ruchu
- **Czas rzeczywisty:** Trasa automatycznie pokazuje aktualny ruch
- **Symulacja:** Wybierz datę i godzinę w przyszłości, aby zobaczyć przewidywany ruch
- **Kolory:**
  - 🟢 **Zielony** - płynny ruch
  - 🟡 **Żółty** - umiarkowany ruch
  - 🟠 **Pomarańczowy** - duże natężenie
  - 🔴 **Czerwony** - korek

### Zapisywanie Tras i Pinezek
- Kliknij **"Zapisz trasę"** aby dodać ją do ulubionych
- Kliknij prawym na mapie i wybierz **"Dodaj pinezkę"** aby oznaczyć miejsce
- Zarządzaj zapisanymi elementami w panelu bocznym

### Statystyki
- Przejdź do zakładki **"Statystyki"**
- Zobacz analizę swoich tras i nawyków podróżowania
- Sprawdź najgorsze godziny dla ruchu w Rzeszowie

---

## 📁 Struktura Projektu

```
trafficwatch/
├── backend/
│   ├── main.py              # Główny plik FastAPI
│   ├── models.py            # Modele bazy danych (SQLAlchemy)
│   ├── schemas.py           # Schematy Pydantic
│   ├── auth.py              # Autoryzacja JWT
│   ├── database.py          # Konfiguracja bazy danych
│   ├── traffic_service.py   # Logika ruchu drogowego
│   ├── gtfs_service.py      # Obsługa danych MPK
│   ├── analytics.py         # Moduł analityczny
│   ├── requirements.txt     # Zależności Python
│   └── .env                 # Zmienne środowiskowe (nie w repo!)
│
└── frontend/
    ├── src/
    │   ├── App.jsx          # Główny komponent
    │   ├── components/      # Komponenty React
    │   │   ├── Map.jsx
    │   │   ├── Login.jsx
    │   │   ├── RoutePanel.jsx
    │   │   ├── Statistics.jsx
    │   │   └── ...
    │   └── index.css        # Style Tailwind
    ├── package.json
    └── vite.config.js
```

---

## 🔧 Konfiguracja API

### TomTom Traffic API
Aplikacja wykorzystuje TomTom do pobierania danych o ruchu w czasie rzeczywistym.

**Limity darmowego planu:**
- 2,500 zapytań/dzień
- Dane dla całego świata



