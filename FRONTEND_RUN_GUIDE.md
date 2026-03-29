# Frontend Development Server Guide

## Running the Frontend Application

### Option 1: Local Development (Recommended for Development)
```bash
cd gofaFrontend
npm start
# or
ng serve --configuration=local
```
- **URL:** `http://localhost:4200`
- **API:** `http://localhost:5000`
- **Auto-reload:** Enabled
- **Best for:** Local development with hot reload

---

### Option 2: Local IP on Port 4200
```bash
cd gofaFrontend
ng serve --configuration=local-ip
```
- **URL:** `http://localhost:4200` (accessible from any machine on network)
- **API:** `http://localhost:5000`
- **Host:** `0.0.0.0` (listens on all network interfaces)
- **Best for:** Testing on other machines on the same network

---

### Option 3: Network IP (10.20.38.51:2023)
```bash
cd gofaFrontend
ng serve --configuration=network
```
- **URL:** `http://10.20.38.51:2023`
- **API:** `http://10.20.38.51:2024`
- **Best for:** Production-like network testing

---

### Option 4: All Network Interfaces (0.0.0.0:2023)
```bash
cd gofaFrontend
ng serve --configuration=network-all
```
- **URL:** `http://10.20.38.51:2023` or `http://[your-ip]:2023`
- **API:** `http://10.20.38.51:2024`
- **Best for:** Testing from multiple machines

---

## Backend API Configuration

### Local Development
- **Backend URL:** `http://localhost:5000`
- **Database:** Windows Authentication on `Josiah-Alex\SQLExpress`
- **Database Name:** `GofaDb`

### Running Backend
```bash
cd Gofabackend
dotnet run
# or
dotnet run --configuration Development
```

---

## Environment Files

### `environment.ts` (Development)
- API Base URL: `http://localhost:5000`
- Used by: `local` and `local-ip` configurations

### `environment.local.ts` (Local)
- API Base URL: `http://localhost:5000`
- Used by: `local` configuration

### `environment.prod.ts` (Production)
- API Base URL: `http://10.20.38.51:2024`
- Used by: `production` configuration

---

## Angular Serve Configurations

| Config | Host | Port | API | Use Case |
|--------|------|------|-----|----------|
| `local` | localhost | 4200 | localhost:5000 | Local dev with hot reload |
| `local-ip` | 0.0.0.0 | 4200 | localhost:5000 | Network accessible on 4200 |
| `development` | 10.20.38.171 | 2023 | 10.20.38.51:2024 | Network dev |
| `production` | 10.20.38.171 | 2023 | 10.20.38.51:2024 | Production |
| `network` | 10.20.38.51 | 2023 | 10.20.38.51:2024 | Network testing |
| `network-all` | 0.0.0.0 | 2023 | 10.20.38.51:2024 | All interfaces |
| `ip-51` | 10.20.38.51 | 2023 | 10.20.38.51:2024 | Specific IP |

---

## Quick Start

### For Local Development:
```bash
# Terminal 1: Backend
cd Gofabackend
dotnet run

# Terminal 2: Frontend
cd gofaFrontend
npm start
```

Then open: `http://localhost:4200`

---

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 4200
# Windows
netstat -ano | findstr :4200
taskkill /PID <PID> /F

# Or use different port
ng serve --port 4201
```

### CORS Issues
- Ensure backend is running on `http://localhost:5000`
- Check `appsettings.json` has `http://localhost:4200` in `AllowedOrigins`

### API Connection Failed
- Verify backend is running: `http://localhost:5000/api/health`
- Check environment file has correct API URL
- Verify database connection string in `appsettings.json`

---

## Building for Production

```bash
cd gofaFrontend
ng build --configuration=production
```

Output: `../latestpublish/GofaApp/vi`

