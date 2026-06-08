**Must-Fix Findings**

1. **STEP 0 package layout is wrong.**  
   In `§STEP 0 T0.2/T0.3`, the plan creates `backend/libs/orderly_fastapi_core/pyproject.toml` and runs `pip install -e backend/libs/orderly_fastapi_core`, but the package files live directly at [__init__.py](/Users/leeyude/Projects/Orderly/backend/libs/orderly_fastapi_core/__init__.py:1). With `where = ["."]` and `include = ["orderly_fastapi_core*"]`, setuptools will not find a nested `orderly_fastapi_core` package.  
   Minimal fix: move the pyproject target to `backend/libs/pyproject.toml` and install with `pip install -e backend/libs`.

2. **STEP 3 gateway aliases are not yet converted to in-process owners.**  
   `§STEP 3 T3.3` says to preserve gateway no-prefix aliases, but current `/products/*` and `/suppliers/*` handlers call `_proxy`, e.g. [main.py](/Users/leeyude/Projects/Orderly/backend/api-gateway-fastapi/app/main.py:634). If copied as-is, STEP 3 still depends on old service URLs and can fail route ownership/order.  
   Minimal fix: add one explicit T3.3 bullet: do not register gateway catch-all/proxy routes; preserve aliases by directly mounting the real routers in-process, especially product routes under both `/api/products` and `/products`.

3. **Frozen WebSocket contract cannot pass as written.**  
   `§STEP 3 T3.5` requires `ws://localhost:$BACKEND_PORT/ws/orders/<orgId>`, and the frontend builds exactly that URL at [order-websocket.ts](/Users/leeyude/Projects/Orderly/lib/websocket/order-websocket.ts:96). I found no FastAPI WebSocket handler in the backend.  
   Minimal fix: either add a small `/ws/orders/{org_id}` handler to `§STEP 3 T3.3` that accepts connections and answers `ping` with `pong`, or remove that row from the frozen contract. Given the stated frontend contract unchanged goal, adding the handler is the practical fix.

**Non-Fatal Note**

`§STEP 1 T1b.1` will currently hit `backend/product-service-fastapi/tests/test_sku_integration.py`, so the “dead” check should exclude/update stale tests rather than stop on that test-only import.

VERDICT: REVISE