#!/bin/bash
# Trigger Render deploy manually
echo "Triggering Render deploy..."
API_KEY=***
SERVICE_ID="srv-d8v41p9kh4rs73d7ocjg"

curl -X POST \
  -H "Authorization: Bearer ${API_KEY}" \
  "https://api.render.com/v1/services/${SERVICE_ID}/deploys"

echo ""
echo "Deploy triggered! Check https://dashboard.render.com in 2-3 minutes."