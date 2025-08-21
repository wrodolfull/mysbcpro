#!/bin/bash

# FreeSWITCH Engine Configuration Script
# This script ensures the correct environment variables are set before starting the API

set -e

echo "🚀 Starting API with FreeSWITCH configuration..."

# Set FreeSWITCH configuration path
export ENGINE_FS_BASE_DIR=/usr/local/freeswitch/conf
export ENGINE_RELOAD_DIALPLAN=false

# ESL Configuration (Event Socket Library)
export ENGINE_ESL_HOST=127.0.0.1
export ENGINE_ESL_PORT=8021
export ENGINE_ESL_PASSWORD=ClueCon

# Audio Configuration  
export ENGINE_AUDIO_DIR=/var/lib/freeswitch/storage/tenant

echo "📁 FreeSWITCH Base Directory: $ENGINE_FS_BASE_DIR"
echo "🔄 Dialplan Reload: $ENGINE_RELOAD_DIALPLAN"
echo ""

# Start the API
echo "▶️  Starting NestJS API..."
pnpm start:dev
