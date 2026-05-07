#!/bin/bash
# Health check all services
# Checks health endpoints for all registered services

set -e

echo "═══ Health Check All Services ═══"

# Service health endpoints (adjust ports as needed)
SERVICES=(
  "gateway:4000"
  "auth-service:4001"
  "tenant-service:4002"
  "ui-os-service:4031"
  "foundation-service:4033"
)

FAILED=0
PASSED=0

for service in "${SERVICES[@]}"; do
  NAME=$(echo "$service" | cut -d: -f1)
  PORT=$(echo "$service" | cut -d: -f2)
  
  echo -n "  Checking $NAME (port $PORT)... "
  
  if curl -sf "http://localhost:$PORT/health" > /dev/null 2>&1; then
    echo "✓ OK"
    ((PASSED++))
  else
    echo "✗ FAILED"
    ((FAILED++))
  fi
done

echo ""
echo "Results: $PASSED passed, $FAILED failed"

if [ $FAILED -eq 0 ]; then
  echo "✓ All services healthy"
  exit 0
else
  echo "✗ $FAILED service(s) unhealthy"
  exit 1
fi
