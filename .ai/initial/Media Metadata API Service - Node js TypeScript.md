> # DEPRECATED
> SUPERSEDED BY: `.ai/README.md`, `.ai/00-project-summary.md`, `.ai/01-product-goals.md`, `.ai/02-scope-mvp-vs-post-mvp.md`, `.ai/22-api-contracts.md`, `.ai/24-error-handling.md`, `.ai/25-validation-rules.md`, `.ai/31-acceptance-criteria.md`
> STATUS: historical source only
> DO NOT USE: for implementation
> USE: `.ai/*` canonical docs instead
> NOTE: this file is preserved only for historical traceability.

# Media Metadata API Service - Node.js/TypeScript

---

## **PROJECT SCOPE DOCUMENT**

## **1. PROJECT OVERVIEW**

## **Purpose**

Build a high-performance, scalable Node.js API server to retrieve and cache media metadata (movies, TV shows, channels) from external sources (TMDB, IMDb) while minimizing external API calls and optimizing response times through intelligent multi-layer caching.

## **Tech Stack**

- **Runtime**: Node.js (Latest LTS version)
- **Language**: TypeScript (with strict mode enabled)
- **Database**: MongoDB (with Mongoose ODM)
- **Cache**: Redis (for token validation & data caching)
- **Containerization**: Docker & Docker Compose
- **Architecture**: Domain-Oriented Microservice Architecture

---

## **2. CORE REQUIREMENTS**

## **2.1 Architecture & Design Patterns**

**MUST IMPLEMENT:**

- Domain-Driven Design (DDD) with clear bounded contexts
- Repository Pattern for data access layer
- Strategy Pattern for external API adapters (TMDB, IMDb)
- Factory Pattern for media type instantiation
- Dependency Injection (using libraries like **`tsyringe`** or **`inversify`**)
- Clean Architecture with clear separation of concerns:
    - **Controllers** (HTTP layer)
    - **Services** (Business logic)
    - **Repositories** (Data access)
    - **DTOs** (Data Transfer Objects)
    - **Entities** (Domain models)
- TypeScript best practices: strict null checks, no **`any`** types (use **`unknown`**), explicit return types

## **2.2 Project Structure**

`src/
├── domains/
│   ├── media/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── entities/
│   │   ├── dtos/
│   │   ├── interfaces/
│   │   └── mappers/
│   └── [future-domains]/
├── shared/
│   ├── middleware/
│   ├── utils/
│   ├── config/
│   ├── types/
│   └── constants/
├── infrastructure/
│   ├── database/
│   ├── cache/
│   ├── http/
│   └── queue/
└── app.ts`

---

## **3. FUNCTIONAL REQUIREMENTS**

## **3.1 Media Retrieval API**

**Endpoints:**

`GET /api/v1/media/movie/:id
GET /api/v1/media/tv-show/:id
GET /api/v1/media/channel/:id
GET /api/v1/media/search`

**Query Parameters Support:**

- **`id`**: Internal database ID
- **`name`**: Media name (with optional **`lang`** parameter)
- **`imdbId`**: IMDb identifier
- **`tmdbId`**: TMDB identifier
- **`lang`**: Language code (default: **`en`**)

**Example Request:**

`GET /api/v1/media/movie?tmdbId=550
GET /api/v1/media/tv-show?name=Breaking+Bad&lang=en
GET /api/v1/media/movie?imdbId=tt0137523`

## **3.2 Multi-Layer Caching Strategy**

**Cache Hierarchy (in order):**

1. **Redis Cache** (L1 - fastest)
    - TTL: Configurable per media type (default: 1 hour)
    - Key format: **`media:{type}:{identifier}:{hash}`**
2. **MongoDB** (L2 - persistent)
    - Stores full media documents
    - Includes metadata: **`createdAt`**, **`updatedAt`**, **`lastValidated`**, **`contentHash`**
3. **External APIs** (L3 - slowest, rate-limited)
    - TMDB API
    - IMDb API (or alternative sources)
    - Only called when cache misses or TTL expires

**Cache Validation Flow:**

`1. Check Redis → if found & not expired → return
2. Check MongoDB → if found & not expired → update Redis → return
3. Call External API → validate hash:
   a. If hash matches DB/cache → extend TTL → return
   b. If hash differs → update MongoDB → update Redis → return`

## **3.3 Request Deduplication (Single-Flight Pattern)**

**Problem:** Multiple concurrent requests for the same media should trigger only ONE external API call.

**Solution:** Implement request coalescing/single-flight pattern:

- Track in-flight requests using a Map: **`Map<string, Promise<MediaData>>`**
- When request arrives:
    1. Check if request for same media is already in-flight
    2. If yes → return the existing Promise
    3. If no → create new Promise, execute fetch, store result
    4. After completion → remove from in-flight map
    5. Share result with all waiting requests

**Implementation Requirement:**

`*// Pseudo-code structure*
class RequestDeduplicator {
  private inFlightRequests: Map<string, Promise<any>>;
  
  async execute<T>(key: string, fn: () => Promise<T>): Promise<T> {
    *// If request exists, return existing promise// Otherwise, execute function and store promise*
  }
}`

## **3.4 Response Hashing & Validation**

**Purpose:** Detect if external API data has changed without full comparison.

**Requirements:**

- Generate SHA-256 hash from configurable response fields
- Store hash in MongoDB alongside data
- Configuration per media type:
    
    `json{
      "movie": ["title", "releaseDate", "plot", "cast"],
      "tvShow": ["title", "seasons", "episodes", "status"],
      "channel": ["name", "programs", "schedule"]
    }`
    
- On TTL expiration:
    1. Fetch fresh data from external API
    2. Generate new hash
    3. Compare with stored hash
    4. Update only if different

## **3.5 Authentication Token Validation**

**Challenge:** Auth server is separate; validating token on every request is expensive.

**Solution:** Token validation caching:

- Cache validated tokens in Redis with configurable TTL (default: 1 hour)
- Key format: **`auth:token:{tokenHash}`**
- Validation flow:
    
    `1. Extract JWT from Authorization header
    2. Generate hash of token (SHA-256)
    3. Check Redis for cached validation result
    4. If cached & not expired → use cached user data
    5. If not cached → call auth service → cache result`
    

**Configuration:**

`interface AuthConfig {
  tokenCacheTTL: number; *// seconds, default: 3600*
  authServiceUrl: string;
  cacheEnabled: boolean;
}`

---

## **4. NON-FUNCTIONAL REQUIREMENTS**

## **4.1 Performance**

- API response time: < 100ms (cache hit), < 2s (cache miss)
- Support 1000+ concurrent requests
- Memory usage: < 512MB under normal load
- Redis connection pooling with max 10 connections
- MongoDB connection pooling with max 20 connections

## **4.2 Scalability**

- Stateless API design (horizontal scaling ready)
- Support for multiple instances behind load balancer
- Domain isolation for easy extension to new media types

## **4.3 Reliability**

- Graceful degradation if external APIs fail
- Circuit breaker pattern for external API calls (using **`opossum`** library)
- Retry logic with exponential backoff (max 3 retries)
- Health check endpoints: **`/health`**, **`/health/ready`**

## **4.4 Observability**

- Structured logging (using **`winston`** or **`pino`**)
- Request correlation IDs
- Log levels: ERROR, WARN, INFO, DEBUG
- Metrics: response times, cache hit rates, error rates
- Environment-specific logging (dev vs production)

## **4.5 Security**

- Input validation using **`joi`** or **`zod`**
- Rate limiting per IP (using **`express-rate-limit`**)
- Helmet.js for security headers
- CORS configuration
- Secrets management via environment variables

---

## **5. DATA MODELS**

## **5.1 MongoDB Schema (Example for Movie)**

`typescriptinterface IMediaDocument {
  _id: ObjectId;
  type: 'movie' | 'tv-show' | 'channel';
  identifiers: {
    internal: string;
    tmdbId?: string;
    imdbId?: string;
  };
  names: Map<string, string>; *// lang -> name mapping*
  data: {
    *// Mapped common structure*
    title: string;
    originalTitle: string;
    description: string;
    releaseDate: Date;
    genres: string[];
    rating: number;
    cast: Array<{ name: string; role: string }>;
    images: {
      poster: string;
      backdrop: string;
    };
    *// Raw source data*
    rawData: {
      tmdb?: any;
      imdb?: any;
    };
  };
  metadata: {
    contentHash: string;
    source: 'tmdb' | 'imdb';
    createdAt: Date;
    updatedAt: Date;
    lastValidated: Date;
    validationTTL: number; *// seconds*
  };
}`

## **5.2 Redis Cache Structure**

`textKey patterns:
- media:{type}:{id}:{hash} → Full media object (TTL: 1h)
- auth:token:{hash} → User data from validated token (TTL: 1h)
- inflight:{type}:{id} → Lock for request deduplication (TTL: 30s)
- config:ttl:{type} → TTL configuration per media type`

---

## **6. CONFIGURATION MANAGEMENT**

**Environment Variables (.env):**

`bash*# Server*
NODE_ENV=production
PORT=3000
API_VERSION=v1

*# MongoDB*
MONGO_URI=mongodb://mongo:27017/media-api
MONGO_POOL_SIZE=20

*# Redis*
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0
REDIS_POOL_SIZE=10

*# External APIs*
TMDB_API_KEY=xxx
TMDB_BASE_URL=https://api.themoviedb.org/3
IMDB_API_KEY=xxx

*# Auth Service*
AUTH_SERVICE_URL=https://auth.example.com
AUTH_TOKEN_CACHE_TTL=3600

*# Cache TTLs (seconds)*
CACHE_TTL_MOVIE=3600
CACHE_TTL_TV_SHOW=7200
CACHE_TTL_CHANNEL=1800

*# Rate Limiting*
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

*# Circuit Breaker*
CIRCUIT_BREAKER_TIMEOUT=5000
CIRCUIT_BREAKER_THRESHOLD=50`

---

## **7. EXTERNAL DEPENDENCIES**

## **7.1 NPM Packages (Minimum Required)**

`json{
  "dependencies": {
    "express": "^4.18.0",
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.0",
    "mongoose": "^8.0.0",
    "redis": "^4.6.0",
    "ioredis": "^5.3.0",
    "dotenv": "^16.0.0",
    "helmet": "^7.0.0",
    "cors": "^2.8.5",
    "express-rate-limit": "^7.0.0",
    "winston": "^3.11.0",
    "axios": "^1.6.0",
    "opossum": "^8.1.0",
    "joi": "^17.11.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "ts-node": "^10.9.0",
    "nodemon": "^3.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "prettier": "^3.0.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.0"
  }
}`

---

## **8. DOCKER CONFIGURATION**

## **8.1 Services Required**

- **`api`**: Node.js application
- **`mongodb`**: MongoDB database
- **`redis`**: Redis cache
- **`mongo-express`** (optional): MongoDB admin UI

## **8.2 docker-compose.yml Structure**

`textversion: '3.8'
services:
  api:
    build: .
    ports: ["3000:3000"]
    depends_on: [mongodb, redis]
    env_file: .env
    
  mongodb:
    image: mongo:7
    ports: ["27017:27017"]
    volumes: ["mongo-data:/data/db"]
    
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    command: redis-server --maxmemory 256mb
    
volumes:
  mongo-data:`

---

## **9. API RESPONSE FORMAT**

## **9.1 Success Response**

`json{
  "success": true,
  "data": {
    "id": "123",
    "type": "movie",
    "title": "Fight Club",
    "releaseDate": "1999-10-15",
    "genres": ["Drama", "Thriller"],
    "rating": 8.8,
    "description": "...",
    "images": {
      "poster": "https://...",
      "backdrop": "https://..."
    }
  },
  "metadata": {
    "source": "cache",
    "timestamp": "2025-10-29T14:30:00Z",
    "requestId": "uuid-here"
  }
}`

## **9.2 Error Response**

`json{
  "success": false,
  "error": {
    "code": "MEDIA_NOT_FOUND",
    "message": "No media found with provided identifier",
    "details": {},
    "requestId": "uuid-here"
  }
}`

---

## **10. TESTING REQUIREMENTS**

## **10.1 Unit Tests**

- Services logic (80%+ coverage)
- Mappers (100% coverage)
- Utilities (100% coverage)

## **10.2 Integration Tests**

- API endpoints
- Database operations
- Redis caching
- External API mocking

## **10.3 Testing Framework**

- Jest for unit/integration tests
- Supertest for API testing
- MongoDB Memory Server for DB tests
- Redis Mock for cache tests

---

## **11. DOCUMENTATION REQUIREMENTS**

**MUST DELIVER:**

1. **README.md**:
    - Project overview
    - Setup instructions
    - Environment variables
    - Docker commands
2. **API_DOCUMENTATION.md**:
    - All endpoints with examples
    - Request/response formats
    - Error codes
3. **ARCHITECTURE.md**:
    - System design diagram
    - Data flow diagrams
    - Caching strategy explanation
4. **CONTRIBUTING.md**:
    - Code style guide
    - Git workflow
    - PR process
5. **Inline Code Documentation**:
    - JSDoc comments for all public methods
    - Complex logic explanations

---

## **12. DEFINITION OF DONE (DoD)**

A feature/task is complete when:

- ✅ Code follows TypeScript best practices (strict mode, no **`any`**)
- ✅ All linting rules pass (ESLint + Prettier)
- ✅ Unit tests written with 80%+ coverage
- ✅ Integration tests for critical paths
- ✅ Code reviewed and approved
- ✅ Documentation updated (README, API docs)
- ✅ Docker build succeeds
- ✅ Environment variables documented
- ✅ No console.log statements (use logger)
- ✅ Error handling implemented properly
- ✅ Performance tested (response times logged)

---

## **13. DELIVERABLES**

1. **Source Code**:
    - Complete Node.js/TypeScript application
    - Git repository with clear commit history
2. **Docker Setup**:
    - Dockerfile
    - docker-compose.yml
    - .dockerignore
3. **Documentation**:
    - All files listed in section 11
4. **Configuration**:
    - .env.example file
    - Environment-specific configs
5. **Tests**:
    - Unit test suite
    - Integration test suite
    - Test coverage report

---

## **14. PROJECT TIMELINE**

## **Phase 1: Foundation (2-3 Days)**

- Project setup (TypeScript, ESLint, Docker)
- Database & Redis connections
- Basic project structure
- Logger configuration

## **Phase 2: Core Implementation (Week 1)**

- Media domain implementation
- External API adapters (TMDB, IMDb)
- Repository pattern & MongoDB schemas
- Response mappers

## **Phase 3: Caching & Optimization (Week 2-3)**

- Multi-layer caching implementation
- Request deduplication (single-flight)
- Hash validation logic
- Token validation caching

## **Phase 4: Testing & Documentation (Week 3)**

- Unit tests
- Integration tests
- API documentation
- Architecture documentation

## **Phase 5: Review & Refinement (Week 4)**

- Code review
- Performance testing
- Bug fixes
- Final documentation updates

**Total Duration:** 4 weeks

---

## **15. BUDGET & COST**

**Fixed Price:** $200

**Payment Milestones:**

- 25% upon completion of Phase 1 (Foundations)
- 25% upon completion of Phase 2 (core implementation)
- 25% upon completion of Phase 4 (testing & docs)
- 25% upon final delivery & acceptance

---

## **16. ACCEPTANCE CRITERIA**

Project will be accepted when:

1. All endpoints function as specified
2. Caching strategy works correctly (verified via logs)
3. Request deduplication prevents duplicate external calls
4. Token validation caching reduces auth service calls
5. Docker setup runs successfully with single command
6. All tests pass (80%+ coverage)
7. Documentation is complete and accurate
8. Performance targets met (< 100ms cache hit, < 2s cache miss)
9. Memory usage stays under 512MB
10. Code review approved by project owner

---

## **17. COMMUNICATION & COLLABORATION**

- **Check-ins:** Twice weekly progress updates
- **Tools:** GitHub for code, Slack/Discord for communication
- **Availability:** Developer available during [TIMEZONE] working hours
- **Response Time:** < 24 hours for questions/clarifications

---

## **18. MAINTENANCE & SUPPORT**

- **Bug Fix Period:** 30 days post-delivery for bugs in delivered scope
- **Knowledge Transfer:** 2-hour session explaining architecture & code
- **Handoff:** Complete codebase + documentation + deployment guide

---

## **19. OUT OF SCOPE**

The following are **NOT** included:

- Frontend/UI development
- Authentication service implementation
- Production deployment & DevOps
- External API integrations beyond TMDB & IMDb
- Advanced analytics or monitoring dashboards
- Database migrations for existing data
- Load testing & performance tuning beyond basic optimization

---

## **20. ASSUMPTIONS**

- External APIs (TMDB, IMDb) keys will be provided by client
- Auth service API documentation available
- MongoDB and Redis accessible via Docker
- No complex data migration required
- Standard REST API patterns acceptable (no GraphQL)

---

## **21. RISKS & MITIGATIONS**

| **Risk** | **Impact** | **Mitigation** |
| --- | --- | --- |
| External API rate limits | High | Aggressive caching, circuit breakers |
| External API changes | Medium | Adapter pattern for easy updates |
| Memory leaks | High | Regular testing, connection pooling |
| Cache inconsistency | Medium | Hash validation, configurable TTLs |
| Scope creep | High | Clear DoD, change request process |

---

## **22. QUESTIONS TO CLARIFY BEFORE START**

1. What is the expected request volume (req/sec)?
2. Are there specific external APIs beyond TMDB/IMDb?
3. What is the auth service API specification?
4. Are there existing MongoDB/Redis instances or new setup?
5. Any specific compliance requirements (GDPR, etc.)?
6. Preferred logging/monitoring tools integration?
7. Expected data retention period?

---

### 23. Useful links

- https://github.com/elselab-io/node-tmdb-sdk?utm_source=chatgpt.com
- https://deepwiki.com/mrcanelas/tmdb-addon/4-caching-and-performance?utm_source=chatgpt.com

---

**Document Version:** 1.0

**Last Updated:** October 29, 2025

**Prepared For:** Freelancer Developer Onboarding
