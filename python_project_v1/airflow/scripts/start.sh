#!/bin/bash

# Start script for Airflow data pipeline
set -e

echo "🚀 Starting Apache Airflow Data Pipeline..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Create necessary directories
mkdir -p data/{raw,processed,logs}
mkdir -p logs

# Set environment variables
export AIRFLOW_UID=$(id -u)
export AIRFLOW_GID=0
export AIRFLOW_PROJ_DIR=$(pwd)

echo "📋 Environment Configuration:"
echo "   AIRFLOW_UID: $AIRFLOW_UID"
echo "   AIRFLOW_PROJ_DIR: $AIRFLOW_PROJ_DIR"

# Generate Fernet key if not exists
if [ -z "$AIRFLOW__CORE__FERNET_KEY" ]; then
    echo "🔑 Generating Fernet key..."
    export AIRFLOW__CORE__FERNET_KEY=$(python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
fi

# Check resource requirements
echo "🔍 Checking system requirements..."

MEMORY_GB=$(free -g | awk 'NR==2{printf "%.1f", $7}')
CPU_CORES=$(nproc)
DISK_GB=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')

echo "   Available Memory: ${MEMORY_GB}GB"
echo "   CPU Cores: ${CPU_CORES}"
echo "   Available Disk: ${DISK_GB}GB"

# Warnings for insufficient resources
if (( $(echo "$MEMORY_GB < 4" | bc -l) )); then
    echo "⚠️  Warning: Less than 4GB memory available. Performance may be affected."
fi

if (( CPU_CORES < 2 )); then
    echo "⚠️  Warning: Less than 2 CPU cores available. Performance may be affected."
fi

# Initialize Airflow (first time setup)
echo "🔧 Initializing Airflow..."
docker-compose up airflow-init

# Start the services
echo "🌟 Starting Airflow services..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 30

# Check service health
echo "🏥 Checking service health..."
docker-compose ps

# Display access information
echo ""
echo "✅ Airflow Data Pipeline is starting up!"
echo ""
echo "📊 Access URLs:"
echo "   Airflow UI:    http://localhost:8080"
echo "   Flower UI:     http://localhost:5555 (if enabled)"
echo "   Grafana:       http://localhost:3000"
echo "   Prometheus:    http://localhost:9090"
echo ""
echo "🔑 Default Credentials:"
echo "   Airflow:  admin / admin"
echo "   Grafana:  admin / admin"
echo ""
echo "📝 Logs:"
echo "   docker-compose logs -f [service-name]"
echo "   Available services: airflow-webserver, airflow-scheduler, airflow-worker"
echo ""
echo "🛠️  Management Commands:"
echo "   Stop:    docker-compose down"
echo "   Restart: docker-compose restart"
echo "   Cleanup: docker-compose down -v"
echo ""
echo "🎯 Next Steps:"
echo "   1. Open Airflow UI at http://localhost:8080"
echo "   2. Enable the 'large_data_etl_pipeline' DAG"
echo "   3. Enable the 'pipeline_monitoring_system' DAG"
echo "   4. Configure email alerts in the .env file"
echo "   5. Set up your data sources"
