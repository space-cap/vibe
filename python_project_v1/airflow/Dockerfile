FROM apache/airflow:2.8.1-python3.11

USER root

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    wget \
    git \
    vim \
    htop \
    && rm -rf /var/lib/apt/lists/*

USER airflow

# Copy requirements
COPY airflow_requirements.txt /app/requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy application code
COPY airflow/ /app/airflow/
COPY .env /app/airflow/.env

# Set environment variables
ENV PYTHONPATH="${PYTHONPATH}:/app/airflow"
ENV AIRFLOW_HOME=/app/airflow
ENV AIRFLOW__CORE__DAGS_FOLDER=/app/airflow/dags
ENV AIRFLOW__CORE__PLUGINS_FOLDER=/app/airflow/plugins

# Create necessary directories
USER root
RUN mkdir -p /app/airflow/data/{raw,processed,logs} && \
    chown -R airflow:root /app/airflow && \
    chmod -R 755 /app/airflow

USER airflow

# Initialize Airflow database
RUN airflow db init

# Create admin user
RUN airflow users create \
    --username admin \
    --firstname Admin \
    --lastname User \
    --role Admin \
    --email admin@company.com \
    --password admin

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start Airflow webserver
CMD ["airflow", "webserver", "--port", "8080"]
