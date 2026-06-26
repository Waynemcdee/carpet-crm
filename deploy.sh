#!/bin/bash
# CarpetCRM Deployment Script
# Run this locally to deploy to Render

set -e

echo "🚀 CarpetCRM Deployment Script"
echo "================================"

# Check if render CLI is installed
if ! command -v render &> /dev/null; then
    echo "Installing Render CLI..."
    curl -fsSL https://render.com/install.sh | bash
fi

# Login to Render (this will open browser)
echo "Please login to Render when prompted..."
render login

# Deploy the service
echo "Deploying CarpetCRM..."
render deploy --service carpet-crm

echo "✅ Deployment complete!"
echo "Your app should be live at: https://carpet-crm-r8d5.onrender.com"