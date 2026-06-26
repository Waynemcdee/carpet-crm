#!/bin/bash
# Trigger Render deploy manually
echo "Triggering Render deploy..."
curl -X POST \
  -H "Authorization: Bearer *** \
  https://api.render.com/v1/services/srv-d8v41p9kh4rs73d7ocjg/deploys
echo ""
echo "Deploy triggered! Check https://dashboard.render.com in 2-3 minutes."