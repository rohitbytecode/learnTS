# CircuitBreaker

A lightweight, production-ready Circuit Breaker implementation in TS.

## Why this exists

In distributed systems and microservices, we often call external services, APIs, or third-party integrations. When those downstream systems start failing, our application can quickly get into trouble.

without protection:
- Every failing call wastes time and resources.
- Our own service becomes slow or unresponsive for users.

The **Circuit Breaker** pattern solves this by adding a safety machanism around risky calls - similar to electrical circuit breaker in your home.
if something wrong -> trips, and carefully tests whether it's safe to resume normal operation.

This class was built because we needed a simple, configurable, and observable circuit breaker that works well in real production code.

## Purpose
- **Prevent cascading failures** by failing fast when a downstram service is unhealthy.
- **Provide visibility** into what's happening through state change callbacks and error types.
- **Add per-call timeout protection** (optional) so a single slow call doesn't hang forever.

It's especially useful for:
- HTTP calls to external APIs
- Database queries that can become slow or flaky

## How it works(high-level forkflow)

The breaker has three states and moves between them based on real outcomes:

### 1. CLOSED (Normal operation)
- All calls go thorugh normally.
- Successes reset the failure counter.
- If failures hit the threshold -> trips to **OPEN**.

### 2. OPEN (Failing fast)
- Calls are rejected immediately with `CircuitBreakerOpenError`.
- NO load is put on the struggling downstream service.
- After a configurable cooldown period (`openDurationMs`), it moves to **HALF_OPEN** to test the waters.

### 3. HALF_OPEN (Recovery probling)
- Only a limited number of calls are allowed through the "probe".
- If enough calls succeed (`successThreshold`), the breaker closes again -> back to normal.
- If any call fails, it immediately goes back to **OPEN** for another cooldown.

## Error types

- `CircuitBreakerOpenError` - Thrown when the circuit is OPEN and we reject the call early.
- `CircuitBreakerTimeoutError` - Thrown when a call exceeds the configured timeout.
- Any other errors from your original function are re-thrown as-is.

## When to use it
Use this whenever you're making calls that:
- Can fail intermittently
- Have variable latency
- Depend on external systems outside your control

If your calls are purely internal and always fast/reliable, you probably don't need it.

---
That's it. Simple, focused protection for flaky dependencies.