#!/bin/bash

# Stop script for Airflow data pipeline
set -e

echo "🛑 Stopping Apache Airflow Data Pipeline..."

# Stop all services
docker-compose down

echo "✅ All services stopped."
echo ""
echo "🧹 Cleanup Options:"
echo "   Remove volumes: docker-compose down -v"
echo "   Remove images:  docker-compose down --rmi all"
echo "   Full cleanup:   docker-compose down -v --rmi all --remove-orphans"
