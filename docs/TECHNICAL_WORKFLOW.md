# Line MCP Server - Technical Workflow & Architecture

This document explains the complete workflow of how the Line MCP Server proof of concept works, including the integration between Model Context Protocol (MCP), LINE Messaging API, and AI services.

## Architecture Overview

```mermaid
graph TB
    subgraph "User Layer"
        User[LINE User]
        LineApp[LINE Mobile App]
    end
    
    subgraph "LINE Platform"
        LineAPI[LINE Messaging API]
        LineServers[LINE Servers]
    end
    
    subgraph "Public Internet"
        ngrok[ngrok Tunnel]
    end
    
    subgraph "Local Development / Server"
        subgraph "Express Server (server.js)"
            Webhook[/webhook Endpoint]
            Health[/ Health Endpoint]
            Analytics[/analytics Endpoint]
        end
        
        subgraph "Handlers"
            MessageHandler[Message Handler]
        end
        
        subgraph "Services"
            MCPService[MCP Service]
            AIService[AI Service]
        end
        
        subgraph "Utilities"
            AnalyticsUtil[Analytics Tracker]
        end
        
        subgraph "Data"
            FAQ[FAQ Document<br/>faq.md]
        end
        
        subgraph "External APIs"
            OpenAI[OpenAI API<br/>or TEST_MODE]
        end
    end
    
    User -->|Sends Message| LineApp
    LineApp -->|1. Message Event| LineServers
    LineServers -->|2. POST /webhook| LineAPI
    LineAPI -->|3. HTTPS Request| ngrok
    ngrok -->|4. Forward to localhost:3000| Webhook
    
    Webhook -->|5. Route Event| MessageHandler
    MessageHandler -->|6. Request FAQ| MCPService
    MCPService -->|7. Read File| FAQ
    FAQ -->|8. Return Content| MCPService
    MCPService -->|9. FAQ Content| MessageHandler
    
    MessageHandler -->|10. Generate Response| AIService
    AIService -->|11. API Call| OpenAI
    OpenAI -->|12. AI Response| AIService
    AIService -->|13. Formatted Response| MessageHandler
    
    MessageHandler -->|14. Track Metrics| AnalyticsUtil
    MessageHandler -->|15. Reply Message| LineAPI
    LineAPI -->|16. Deliver Message| LineServers
    LineServers -->|17. Push to User| LineApp
    LineApp -->|18. Display Response| User
    
    style FAQ fill:#e1f5ff
    style MCPService fill:#fff3cd
    style AIService fill:#d4edda
    style OpenAI fill:#f8d7da
```

## Component Breakdown

### 1. **LINE Messaging API Integration**

#### How LINE Connects to Your Server

```
┌─────────────────┐
│  LINE Platform  │
│                 │
│  Webhook Config:│
│  https://your-  │
│  ngrok-url/     │
│  webhook        │
└────────┬────────┘
         │
         │ POST /webhook
         │ Headers:
         │  - x-line-signature
         │  - Content-Type: application/json
         │ Body:
         │  {
         │    "events": [...]
         │  }
         ▼
┌─────────────────┐
│  Your Server    │
│  (Express)      │
└─────────────────┘
```

**Key Files:**
- [`src/server.js`](file:///Users/bowlingnoi/Project/shippop-mysave.cc/my_adhoc/line_mcp/src/server.js#L52-L75) - Webhook endpoint handler
- Uses `@line/bot-sdk` middleware for signature validation

### 2. **Model Context Protocol (MCP) Implementation**

#### What is MCP in This Project?

The **Model Context Protocol** is a design pattern that treats the FAQ document as a **resource** that can be:
- Loaded on demand
- Cached for performance
- Provided as context to AI

```javascript
// MCP Service Pattern
┌──────────────────────────────────────┐
│         MCP Service                  │
│                                      │
│  Resource: FAQ Document              │
│  URI: file://./data/faq.md          │
│                                      │
│  Methods:                            │
│  - getFAQContent()                   │
│  - clearCache()                      │
│  - getResourceMetadata()             │
└──────────────────────────────────────┘
```

**Implementation:** [`src/services/mcpService.js`](file:///Users/bowlingnoi/Project/shippop-mysave.cc/my_adhoc/line_mcp/src/services/mcpService.js)

**Key Features:**
- ✅ 5-minute caching (reduces file I/O)
- ✅ Graceful error handling
- ✅ Stale cache fallback
- ✅ Resource metadata exposure

### 3. **Complete Message Flow (Step-by-Step)**

#### Scenario: User asks "What are the shipping rates?"

```
Step 1: User Action
┌─────────────────────────────────────────┐
│ User opens LINE app                     │
│ User types: "What are the shipping      │
│ rates?"                                 │
│ User presses Send                       │
└─────────────────────────────────────────┘
                    │
                    ▼
Step 2: LINE Platform Processing
┌─────────────────────────────────────────┐
│ LINE receives message                   │
│ Creates webhook event:                  │
│ {                                       │
│   "type": "message",                    │
│   "message": {                          │
│     "type": "text",                     │
│     "text": "What are the shipping      │
│             rates?"                     │
│   },                                    │
│   "source": {                           │
│     "userId": "U1234..."                │
│   },                                    │
│   "replyToken": "abc123..."             │
│ }                                       │
└─────────────────────────────────────────┘
                    │
                    ▼
Step 3: Webhook Delivery
┌─────────────────────────────────────────┐
│ LINE POST request to:                   │
│ https://your-ngrok.app/webhook          │
│                                         │
│ Headers:                                │
│ - x-line-signature: <hmac-sha256>       │
│ - Content-Type: application/json        │
└─────────────────────────────────────────┘
                    │
                    ▼
Step 4: ngrok Tunnel
┌─────────────────────────────────────────┐
│ ngrok receives HTTPS request            │
│ Forwards to: http://localhost:3000      │
└─────────────────────────────────────────┘
                    │
                    ▼
Step 5: Express Server (server.js)
┌─────────────────────────────────────────┐
│ app.post('/webhook', middleware, ...)   │
│                                         │
│ 1. LINE SDK validates signature         │
│ 2. Parses JSON body                     │
│ 3. Extracts events array                │
│ 4. Routes to messageHandler             │
└─────────────────────────────────────────┘
                    │
                    ▼
Step 6: Message Handler (messageHandler.js)
┌─────────────────────────────────────────┐
│ handleMessage(event)                    │
│                                         │
│ 1. Check event type === 'message'       │
│ 2. Extract user message text            │
│ 3. Extract userId and replyToken        │
│                                         │
│ userMessage = "What are the shipping    │
│                rates?"                  │
└─────────────────────────────────────────┘
                    │
                    ▼
Step 7: Load FAQ via MCP Service
┌─────────────────────────────────────────┐
│ mcpService.getFAQContent()              │
│                                         │
│ 1. Check cache (5-min TTL)              │
│ 2. If expired, read faq.md              │
│ 3. Update cache                         │
│ 4. Return FAQ content (5980 chars)      │
│                                         │
│ faqContent = "# Shippop FAQ\n..."       │
└─────────────────────────────────────────┘
                    │
                    ▼
Step 8: AI Service Processing
┌─────────────────────────────────────────┐
│ aiService.generateResponse(             │
│   userQuestion,                         │
│   faqContent                            │
│ )                                       │
│                                         │
│ If TEST_MODE:                           │
│   → generateMockResponse()              │
│      Detect keywords: "rates", "price"  │
│      Return canned response             │
│                                         │
│ If OpenAI Mode:                         │
│   → buildSystemPrompt(faqContent)       │
│   → Call OpenAI API                     │
│   → Parse response                      │
│                                         │
│ Result:                                 │
│ {                                       │
│   text: "🚚 Shipping rates...",         │
│   autoResolved: true,                   │
│   model: "mock" or "gpt-4o-mini"        │
│ }                                       │
└─────────────────────────────────────────┘
                    │
                    ▼
Step 9: Analytics Tracking
┌─────────────────────────────────────────┐
│ analytics.trackQuery({                  │
│   question: userQuestion,               │
│   wasAutoResolved: true,                │
│   error: null                           │
│ })                                      │
│                                         │
│ Updates:                                │
│ - totalQueries++                        │
│ - autoResolved++                        │
│ - Logs query in history                 │
└─────────────────────────────────────────┘
                    │
                    ▼
Step 10: Send Reply to LINE
┌─────────────────────────────────────────┐
│ lineClient.replyMessage(                │
│   replyToken,                           │
│   {                                     │
│     type: 'text',                       │
│     text: response.text                 │
│   }                                     │
│ )                                       │
│                                         │
│ → POST to LINE Messaging API            │
└─────────────────────────────────────────┘
                    │
                    ▼
Step 11: LINE Delivers to User
┌─────────────────────────────────────────┐
│ LINE Platform receives reply            │
│ Pushes message to user's device         │
│ User sees bot response in chat          │
└─────────────────────────────────────────┘
```

## File-by-File Workflow

### [`src/server.js`](file:///Users/bowlingnoi/Project/shippop-mysave.cc/my_adhoc/line_mcp/src/server.js) - Entry Point

**Responsibilities:**
1. Initialize Express server
2. Configure LINE SDK middleware
3. Define webhook endpoint
4. Validate configuration on startup
5. Provide health check and analytics endpoints

**Key Code:**
```javascript
// LINE webhook endpoint
app.post('/webhook', middleware(lineConfig), async (req, res) => {
  const events = req.body.events;
  
  // Process all events in parallel
  await Promise.all(events.map(async (event) => {
    switch (event.type) {
      case 'message':
        await messageHandler.handleMessage(event);
        break;
      case 'follow':
        await messageHandler.handleFollow(event);
        break;
      // ...
    }
  }));
  
  res.json({ status: 'ok' });
});
```

### [`src/handlers/messageHandler.js`](file:///Users/bowlingnoi/Project/shippop-mysave.cc/my_adhoc/line_mcp/src/handlers/messageHandler.js) - Message Orchestrator

**Responsibilities:**
1. Route different message types
2. Orchestrate MCP and AI services
3. Send responses via LINE
4. Track analytics
5. Handle errors gracefully

**Flow:**
```javascript
handleMessage(event) {
  1. Extract user message
  2. faqContent = await mcpService.getFAQContent()
  3. response = await aiService.generateResponse(message, faq)
  4. analytics.trackQuery(...)
  5. await lineClient.replyMessage(...)
}
```

### [`src/services/mcpService.js`](file:///Users/bowlingnoi/Project/shippop-mysave.cc/my_adhoc/line_mcp/src/services/mcpService.js) - Resource Manager

**MCP Pattern Implementation:**

```javascript
class MCPService {
  // Resource: FAQ Document
  getFAQContent() {
    // Check cache
    if (cache valid) return cached content
    
    // Load resource
    content = fs.readFile(faqPath)
    
    // Update cache
    cache = content
    
    return content
  }
}
```

**Why MCP?**
- **Standardized resource access**: Treat FAQ as a queryable resource
- **Caching layer**: Improves performance
- **Abstraction**: Easy to swap FAQ source (file → database → API)
- **Context provision**: Provides structured context to AI

### [`src/services/aiService.js`](file:///Users/bowlingnoi/Project/shippop-mysave.cc/my_adhoc/line_mcp/src/services/aiService.js) - AI Response Generator

**Two Modes:**

#### TEST_MODE (Mock Responses)
```javascript
generateMockResponse(question) {
  if (question includes "rates") {
    return shipping_rates_response
  } else if (question includes "delivery") {
    return delivery_time_response
  } else {
    return escalation_response
  }
}
```

#### OpenAI Mode
```javascript
generateResponse(question, faqContent) {
  systemPrompt = `You are CS assistant.
                  Use ONLY this FAQ: ${faqContent}`
  
  response = await openai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question }
    ]
  })
  
  return response
}
```

### [`src/utils/analytics.js`](file:///Users/bowlingnoi/Project/shippop-mysave.cc/my_adhoc/line_mcp/src/utils/analytics.js) - Metrics Tracker

**Tracks:**
- Total queries
- Auto-resolved rate
- Escalation rate
- Time/cost savings estimation

**Output:**
```
📊 ANALYTICS SUMMARY
========================================
Total Queries:      50
✅ Auto-Resolved:   40 (80.00%)
👤 Escalated:       10 (20.00%)
⏱️  Uptime:          120 minutes
========================================
```

## Data Flow Diagram

```
User Input
    │
    ▼
┌─────────────────────┐
│  LINE Platform      │ POST /webhook
│  Message: "Text"    │──────────────┐
└─────────────────────┘              │
                                     ▼
                          ┌──────────────────────┐
                          │  Express Server      │
                          │  (server.js)         │
                          └──────────┬───────────┘
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │  Message Handler     │
                          │  (messageHandler.js) │
                          └──────┬───────┬───────┘
                                 │       │
                    ┌────────────┘       └──────────┐
                    ▼                                ▼
        ┌───────────────────┐            ┌──────────────────┐
        │  MCP Service      │            │  AI Service      │
        │  (mcpService.js)  │            │  (aiService.js)  │
        └─────────┬─────────┘            └────────┬─────────┘
                  │                               │
                  ▼                               ▼
        ┌──────────────────┐           ┌──────────────────┐
        │  FAQ Document    │           │  OpenAI API      │
        │  (faq.md)        │           │  or Mock         │
        └──────────────────┘           └──────────────────┘
                  │                               │
                  └───────────┐   ┌───────────────┘
                              ▼   ▼
                    ┌──────────────────────┐
                    │  Response Generated  │
                    │  "Shipping: 50 THB"  │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Analytics Tracking  │
                    │  (analytics.js)      │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  LINE Reply API      │
                    │  Send to User        │
                    └──────────────────────┘
```

## Environment Configuration Flow

```
.env file
├── PORT=3000
├── LINE_CHANNEL_ACCESS_TOKEN  ──→  Used by @line/bot-sdk
├── LINE_CHANNEL_SECRET        ──→  Webhook signature validation
├── TEST_MODE=true/false       ──→  Determines AI mode
├── OPENAI_API_KEY            ──→  OpenAI authentication
├── OPENAI_MODEL              ──→  Model selection
└── FAQ_FILE_PATH             ──→  MCP resource location
```

## Key Design Patterns

### 1. **Singleton Services**
All services export singleton instances:
```javascript
const mcpService = new MCPService();
export default mcpService;
```
Benefits: Shared state, single cache instance

### 2. **Async/Await Error Handling**
```javascript
try {
  const result = await someAsyncOperation();
} catch (error) {
  console.error('Error:', error);
  return fallbackValue;
}
```

### 3. **Middleware Chain (Express)**
```javascript
app.post('/webhook', 
  middleware(lineConfig),  // LINE SDK validation
  async (req, res) => {    // Business logic
    // ...
  }
);
```

### 4. **MCP Resource Pattern**
- Treat FAQ as a "resource"
- Provide standard interface (getFAQContent)
- Cache management
- Metadata exposure

## Security Flow

```
LINE Request
    │
    │ Headers: x-line-signature: abc123...
    ▼
┌─────────────────────────────────────────┐
│  @line/bot-sdk Middleware               │
│                                         │
│  1. Extract signature from header       │
│  2. Compute HMAC-SHA256:                │
│     hmac(channelSecret, requestBody)    │
│  3. Compare signatures                  │
│  4. If match: proceed                   │
│  5. If mismatch: 401 Unauthorized       │
└─────────────────────────────────────────┘
```

## Testing Workflow

### Local Development
```bash
Terminal 1: npm start          # Start Express server
Terminal 2: ngrok http 3000    # Expose to internet
Browser:    Configure webhook  # Point LINE to ngrok URL
LINE App:   Send test message  # Trigger workflow
Terminal 1: View logs          # Watch processing
Browser:    /analytics         # Check metrics
```

### Test Mode vs Production

| Feature | TEST_MODE=true | TEST_MODE=false |
|---------|---------------|-----------------|
| AI Provider | Mock responses | OpenAI API |
| Cost | Free | ~$0.002/query |
| Speed | Instant | 1-3 seconds |
| Accuracy | Basic keywords | High quality |
| Use Case | Development | Production |

## Performance Optimization

### 1. **FAQ Caching**
- First request: Read from file (~10ms)
- Subsequent requests: Return from cache (~1ms)
- Cache expires: 5 minutes

### 2. **Parallel Event Processing**
```javascript
await Promise.all(events.map(handleMessage));
```
Multiple messages processed simultaneously

### 3. **Connection Pooling**
LINE SDK and OpenAI client reuse connections

## Monitoring & Observability

### Logs
```
[Server] Received 1 event(s)
[Server] Processing event type: message
[Message Handler] Received message from U1234: "rates?"
[MCP Service] Using cached FAQ content
[AI Service] 🧪 Generating MOCK response for: "rates?"
[Message Handler] Response sent (auto-resolved: true)
```

### Metrics Endpoints
- `GET /` - Health check
- `GET /analytics` - Real-time metrics
- Console - Periodic summaries

## Summary

This Line MCP Server implementation demonstrates:

1. **LINE Integration**: Webhook-based event processing
2. **MCP Pattern**: FAQ as queryable resource
3. **AI/Mock Modes**: Flexible testing without API costs
4. **Analytics**: ROI tracking and performance monitoring
5. **Production-Ready**: Error handling, logging, security

The architecture is modular, testable, and scalable for production use.
