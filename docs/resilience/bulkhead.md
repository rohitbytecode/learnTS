# Adaptive Priority Bulkhead (Queue- based with Fairness & Dynamic Concurrency)

## Type

Semaphore-based Bulkhead with:

- Bound Queue
- Priority Scheduling
- Aging (Anti-starvation)
- Adaptive Concurrency (EMA+ AIMD)

## Intro

A self-regulating bulkhead that controls concurrency, prioritizes critical work, ensures fairness, and dynamically adjusts capacity based on system health.

# Bulkhead- workflow

## Purpose

Controls concurrency and prevents one workload from exhausting system resources.

---

## Flow

1. **Request arrives**

- Check active executions vs allowed limit

2. **If slot available**

- Execute immediately

3. **If limit reached **

- If queue disabled -> reject (fail-fast)
- If queue enabled:
  - If space available -> enqueue
  - If full -> reject

4. **Queue processing**

- Select next task (waiting tasks gain priority)

5. **Timeout handling**

- If request waits too long -> remove + reject

6. **Execution**
   - Run task
   - Record latency + success/failure

7. **Adaptive control**
   - High error/latency -> decrease concurrency
   - Stable system -> increase cuncurrency

---

## Guarantees

- Limits cuncurrent load
- Precents resource exhaustion
- Ensures fairness (no starvation)
- Fails fast under pressure

---

## Placement

```
Bulkhead -> Retry -> Circuit Breaker -> Service
```

---

## Usage

Apply per resource:

- DB
- External APIs
- Heavy tasks

Avoid global bulkhead.
