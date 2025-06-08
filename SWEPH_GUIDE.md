# Swiss Ephemeris (sweph) Module Guide

This guide covers everything you need to know about the Swiss Ephemeris module in the Stellium Backend project, including setup, deployment, troubleshooting, and modifications.

## Overview

The Swiss Ephemeris (sweph) is a high-precision astronomical calculation library used for:
- Birth chart calculations
- Planetary positions and movements
- House system calculations
- Transit computations
- Aspect calculations

In our AWS Lambda environment, sweph runs as a native Node.js binary distributed through a Lambda Layer.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Lambda Layer  │    │  Main Function   │    │  Ephemeris Data │
│                 │    │                  │    │                 │
│ sweph binary    │◄───┤ ephemerisData    │◄───┤ data/*.se1      │
│ node_modules/   │    │ Service.ts       │    │ files           │
│ sweph/          │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Current Configuration

### Runtime Requirements
- **AWS Lambda Runtime**: `nodejs20.x` (Amazon Linux 2023)
- **Architecture**: `arm64`
- **GLIBC Version**: 2.34+ (provided by Amazon Linux 2023)
- **Layer**: `stellium-sweph-layer:4`

### Key Files
- **Layer Configuration**: `layer-deploy.yml`
- **Main Service**: `services/ephemerisDataService.ts`
- **Binary Location**: `/opt/nodejs/node_modules/sweph/build/Release/sweph.node`
- **Ephemeris Data**: `/var/task/data/*.se1`

## Setup and Deployment

### 1. Building the sweph Layer

The sweph module requires native compilation for the Lambda environment. We use Docker to build a compatible binary:

```bash
# Build Lambda-compatible binary (uses official AWS Lambda Node.js image)
docker build -f Dockerfile.lambda -t sweph-lambda-builder .

# Extract binary from container
rm -rf layer/nodejs
docker create --name sweph-lambda-extract sweph-lambda-builder /bin/bash
docker cp sweph-lambda-extract:/nodejs layer/
docker rm sweph-lambda-extract

# Verify binary exists
ls -la layer/nodejs/node_modules/sweph/build/Release/sweph.node
```

### 2. Deploying the Layer

```bash
# Deploy sweph layer
npx serverless deploy --config layer-deploy.yml

# Note the layer ARN and version (e.g., arn:aws:lambda:us-east-1:547054413317:layer:stellium-sweph-layer:4)
```

### 3. Updating Main Function

Update `serverless.yml` with the new layer version:

```yaml
functions:
  app:
    handler: server.handler
    runtime: nodejs20.x
    architecture: arm64
    layers:
      - arn:aws:lambda:us-east-1:547054413317:layer:stellium-sweph-layer:4  # Update version here
```

### 4. Deploy Main Application

```bash
# Build TypeScript
npm run build

# Deploy main function
npx serverless deploy
```

## File Structure

```
stellium-backend/
├── layer/                          # Lambda layer content
│   └── nodejs/
│       └── node_modules/
│           └── sweph/              # Complete sweph module
│               ├── build/Release/
│               │   └── sweph.node  # Native binary
│               ├── index.js        # Module entry point
│               ├── constants.js    # Sweph constants
│               └── package.json
├── data/                           # Ephemeris data files
│   ├── seas_18.se1                # Asteroid data
│   ├── semo_18.se1                # Moon data
│   └── sepl_18.se1                # Planet data
├── services/
│   └── ephemerisDataService.ts     # Main sweph integration
├── Dockerfile.lambda               # Lambda-compatible build
├── layer-deploy.yml                # Layer deployment config
└── serverless.yml                  # Main function config
```

## Key Functions

### Module Loading (`ephemerisDataService.ts`)

```typescript
// Async function to load sweph module
async function loadSweph() {
  const pathsToTry = [
    'sweph',                                    // Standard import
    '/opt/nodejs/node_modules/sweph',          // Layer path
    'file:///opt/nodejs/node_modules/sweph/index.mjs' // Direct ESM path
  ];
  
  for (const path of pathsToTry) {
    try {
      const swephModule = await import(path);
      sweph = swephModule.default || swephModule;
      return true;
    } catch (error) {
      console.warn(`Failed to load sweph from ${path}:`, error.message);
    }
  }
  return false;
}
```

### Initialization

```typescript
export async function initializeEphemeris() {
  if (!ephemerisInitialized) {
    if (!sweph && !swephLoadError) {
      await loadSweph();
    }
    
    if (sweph) {
      // Set ephemeris data path for Lambda
      const ephePath = process.env.LAMBDA_TASK_ROOT ? '/var/task/data' : './data';
      sweph.set_ephe_path(ephePath);
      ephemerisInitialized = true;
    }
  }
}
```

### Birth Chart Calculation

```typescript
export async function getRawChartDataEphemeris(data) {
  await initializeEphemeris(); // IMPORTANT: Must await this!
  
  const { year, month, day, hour, min, lat, lon, tzone } = data;
  const decimalHours = hour + min / 60;
  const utcDecimalHours = decimalHours - tzone;
  
  // Calculate Julian Day
  const jdUT = sweph.julday(year, month, day, utcDecimalHours, 1);
  
  // Calculate houses
  const result = await sweph.houses(jdUT, lat, lon, 'P'); // Placidus
  
  // Calculate planetary positions
  const planetIds = [
    sweph.constants.SE_SUN, sweph.constants.SE_MOON, 
    sweph.constants.SE_MERCURY, sweph.constants.SE_VENUS,
    // ... etc
  ];
  
  const planets = planetIds.map(pid => {
    const pos = sweph.calc_ut(jdUT, pid, flags);
    return {
      name: sweph.get_planet_name(pid),
      full_degree: pos.data[0],
      speed: pos.data[3],
      is_retro: pos.data[3] < 0
    };
  });
}
```

## Testing sweph Functionality

### 1. Test User Creation (requires sweph)

```bash
curl -X POST https://your-api-gateway-url/dev/createUser \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "dateOfBirth": "1990-06-08",
    "timeOfBirth": "15:30",
    "placeOfBirth": "San Francisco, CA",
    "lat": 37.7749,
    "lon": -122.4194,
    "tzone": -7
  }'
```

### 2. Check Lambda Logs

```bash
# View real-time logs
npx serverless logs -f app --tail

# View recent logs
npx serverless logs -f app
```

Look for these log messages:
- ✅ `Successfully loaded sweph module from: sweph`
- ✅ `Sweph constants available: Yes`
- ❌ `Failed to load sweph from X: [error message]`
- ❌ `All sweph loading attempts failed`

## Troubleshooting

### Common Issues

#### 1. GLIBC Version Mismatch
**Error**: `/lib64/libm.so.6: version 'GLIBC_2.29' not found`

**Solution**: Ensure you're using `nodejs20.x` runtime (Amazon Linux 2023 with GLIBC 2.34)

```yaml
# serverless.yml
provider:
  runtime: nodejs20.x  # NOT nodejs18.x
```

#### 2. Missing await in initialization
**Error**: `Cannot read properties of null (reading 'julday')`

**Solution**: Always await `initializeEphemeris()`:

```typescript
// WRONG
export async function someFunction(data) {
  initializeEphemeris();  // Missing await!
  const jd = sweph.julday(...);
}

// CORRECT
export async function someFunction(data) {
  await initializeEphemeris();  // Proper await
  const jd = sweph.julday(...);
}
```

#### 3. Layer Version Mismatch
**Error**: Function references old layer version

**Solution**: Update layer ARN in `serverless.yml` after deploying new layer:

```yaml
layers:
  - arn:aws:lambda:us-east-1:547054413317:layer:stellium-sweph-layer:4  # Update version
```

#### 4. Architecture Mismatch
**Error**: `exec format error` or `invalid ELF header`

**Solution**: Ensure consistent ARM64 architecture:

```yaml
# serverless.yml
functions:
  app:
    architecture: arm64

# layer-deploy.yml
layers:
  sweph:
    compatibleArchitectures:
      - arm64
```

#### 5. Missing Ephemeris Data
**Error**: Sweph loads but calculations fail

**Solution**: Ensure `.se1` files are in `/var/task/data/`:

```bash
# Check data files are included in deployment
ls -la data/
# Should show: seas_18.se1, semo_18.se1, sepl_18.se1
```

### Debugging Steps

1. **Check Layer Deployment**:
   ```bash
   # List layers
   aws lambda list-layers
   
   # Get layer details
   aws lambda get-layer-version --layer-name stellium-sweph-layer --version-number 4
   ```

2. **Verify Binary Compatibility**:
   ```bash
   # In Lambda logs, look for:
   # "Layer path exists: true"
   # "Binary exists: true"
   # "Successfully loaded sweph module from: sweph"
   ```

3. **Test Locally** (for development):
   ```bash
   npm run dev
   # Test against local serverless-offline instance
   ```

## Modifying sweph Integration

### Adding New Calculation Functions

1. **Add function to `ephemerisDataService.ts`**:
   ```typescript
   export async function calculateTransits(natalData, transitDate) {
     await initializeEphemeris();
     
     // Your transit calculation logic
     const jd = sweph.julday(transitDate.year, transitDate.month, transitDate.day, 0, 1);
     // ... more calculations
   }
   ```

2. **Add route in `routes/indexRoutes.ts`**:
   ```typescript
   router.post('/calculateTransits', handleTransitCalculation);
   ```

3. **Add controller in `controllers/astroDataController.ts`**:
   ```typescript
   export const handleTransitCalculation = async (req, res) => {
     try {
       const result = await calculateTransits(req.body.natal, req.body.transitDate);
       res.json(result);
     } catch (error) {
       res.status(500).json({ error: error.message });
     }
   };
   ```

### Updating sweph Version

1. **Modify `Dockerfile.lambda`**:
   ```dockerfile
   # Update npm install command with specific version
   RUN npm install sweph@2.10.3-b-2 --build-from-source
   ```

2. **Rebuild and redeploy layer**:
   ```bash
   docker build -f Dockerfile.lambda -t sweph-lambda-builder .
   # ... extract and deploy as above
   ```

### Adding New Ephemeris Data

1. **Download `.se1` files** from [Swiss Ephemeris website](https://www.astro.com/swisseph/)

2. **Add to `data/` directory**:
   ```bash
   cp new_ephemeris_file.se1 data/
   ```

3. **Redeploy** (data files are included in main function, not layer):
   ```bash
   npx serverless deploy
   ```

## Performance Considerations

### Memory Usage
- sweph binary: ~1MB
- Ephemeris data: ~2MB
- Runtime memory: 128-256MB typically sufficient

### Cold Start Impact
- Layer loading: ~200-500ms additional cold start time
- sweph initialization: ~50-100ms
- First calculation: ~100-200ms
- Subsequent calculations: ~10-50ms

### Optimization Tips

1. **Reuse Lambda containers**:
   ```typescript
   // Initialize once per container
   let ephemerisInitialized = false;
   ```

2. **Cache calculations** where appropriate:
   ```typescript
   const calculationCache = new Map();
   ```

3. **Batch calculations** when possible:
   ```typescript
   // Calculate multiple planets in single call
   const planets = planetIds.map(id => sweph.calc_ut(jd, id, flags));
   ```

## Security Considerations

- Ephemeris data files are read-only
- No user input directly passed to sweph calculations
- All astronomical calculations are deterministic
- No sensitive data stored in sweph module

## Monitoring and Logging

### Key Metrics to Monitor
- Lambda duration (should be <30s for most calculations)
- Memory usage (typically <256MB)
- Error rate for sweph-dependent endpoints
- Cold start frequency

### Important Log Messages
```
✅ "Successfully loaded sweph module"
✅ "Sweph constants available: Yes"  
✅ "jdUT: [number]" (successful Julian Day calculation)
❌ "Cannot read properties of null (reading 'julday')"
❌ "Swiss Ephemeris module not available"
```

## References

- [Swiss Ephemeris Documentation](https://www.astro.com/swisseph/)
- [sweph npm package](https://www.npmjs.com/package/sweph)
- [AWS Lambda Layers](https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html)
- [Node.js 20.x Lambda Runtime](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html)