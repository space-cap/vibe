from datetime import datetime, timedelta
import logging
from typing import Dict, Any

from airflow import DAG
from airflow.decorators import task
from airflow.operators.python import PythonOperator
from airflow.providers.postgres.hooks.postgres import PostgresHook
from airflow.models import Variable
from airflow.utils.task_group import TaskGroup

# Import monitoring utilities
import sys
sys.path.append('/app/airflow')

from utils.monitoring import prometheus_metrics, alert_manager, pipeline_monitor

logger = logging.getLogger(__name__)

# DAG Configuration
DEFAULT_ARGS = {
    'owner': 'data-engineering',
    'depends_on_past': False,
    'start_date': datetime(2024, 1, 1),
    'email': ['admin@company.com'],
    'email_on_failure': True,
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

# Monitoring DAG
monitoring_dag = DAG(
    'pipeline_monitoring_system',
    default_args=DEFAULT_ARGS,
    description='Comprehensive monitoring and alerting for data pipelines',
    schedule_interval=timedelta(minutes=10),  # Run every 10 minutes
    start_date=datetime(2024, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=['monitoring', 'alerting', 'system']
)


@task
def collect_pipeline_metrics(**context) -> Dict[str, Any]:
    """Collect comprehensive pipeline metrics"""
    logger.info("Collecting pipeline metrics...")

    postgres_hook = PostgresHook(postgres_conn_id='postgres_default')

    # Query DAG run statistics
    dag_stats_query = """
    SELECT
        dag_id,
        state,
        COUNT(*) as run_count,
        AVG(EXTRACT(EPOCH FROM (end_date - start_date))) as avg_duration
    FROM dag_run
    WHERE start_date >= NOW() - INTERVAL '24 hours'
    GROUP BY dag_id, state
    ORDER BY dag_id, state;
    """

    # Query task instance statistics
    task_stats_query = """
    SELECT
        dag_id,
        task_id,
        state,
        COUNT(*) as task_count,
        AVG(EXTRACT(EPOCH FROM (end_date - start_date))) as avg_duration
    FROM task_instance
    WHERE start_date >= NOW() - INTERVAL '24 hours'
    GROUP BY dag_id, task_id, state
    ORDER BY dag_id, task_id, state;
    """

    # Query recent failures
    failures_query = """
    SELECT
        dag_id,
        task_id,
        execution_date,
        start_date,
        end_date,
        duration,
        try_number
    FROM task_instance
    WHERE state = 'failed'
    AND start_date >= NOW() - INTERVAL '24 hours'
    ORDER BY start_date DESC
    LIMIT 50;
    """

    try:
        dag_stats = postgres_hook.get_records(dag_stats_query)
        task_stats = postgres_hook.get_records(task_stats_query)
        recent_failures = postgres_hook.get_records(failures_query)

        # Process statistics
        metrics = {
            'collection_timestamp': datetime.now().isoformat(),
            'dag_statistics': {
                'total_dags': len(set(row[0] for row in dag_stats)),
                'successful_runs_24h': sum(row[2] for row in dag_stats if row[1] == 'success'),
                'failed_runs_24h': sum(row[2] for row in dag_stats if row[1] == 'failed'),
                'avg_success_duration': sum(row[3] or 0 for row in dag_stats if row[1] == 'success' and row[3]) / max(1, len([r for r in dag_stats if r[1] == 'success' and r[3]])),
                'details': [{'dag_id': row[0], 'state': row[1], 'count': row[2], 'avg_duration': row[3]} for row in dag_stats]
            },
            'task_statistics': {
                'total_tasks_24h': sum(row[3] for row in task_stats),
                'failed_tasks_24h': sum(row[3] for row in task_stats if row[2] == 'failed'),
                'details': [{'dag_id': row[0], 'task_id': row[1], 'state': row[2], 'count': row[3], 'avg_duration': row[4]} for row in task_stats]
            },
            'recent_failures': [
                {
                    'dag_id': row[0],
                    'task_id': row[1],
                    'execution_date': row[2].isoformat() if row[2] else None,
                    'duration': row[5],
                    'try_number': row[6]
                }
                for row in recent_failures
            ]
        }

        # Calculate failure rates
        total_runs = metrics['dag_statistics']['successful_runs_24h'] + metrics['dag_statistics']['failed_runs_24h']
        if total_runs > 0:
            metrics['failure_rate'] = metrics['dag_statistics']['failed_runs_24h'] / total_runs
        else:
            metrics['failure_rate'] = 0

        # Record metrics in Prometheus
        for dag_stat in dag_stats:
            prometheus_metrics.dag_runs_total.labels(
                dag_id=dag_stat[0],
                state=dag_stat[1]
            ).inc(dag_stat[2])

            if dag_stat[3]:  # avg_duration exists
                prometheus_metrics.dag_duration.labels(dag_id=dag_stat[0]).observe(dag_stat[3])

        logger.info(f"Collected metrics for {metrics['dag_statistics']['total_dags']} DAGs")
        return metrics

    except Exception as e:
        logger.error(f"Error collecting pipeline metrics: {e}")
        raise


@task
def monitor_data_quality(**context) -> Dict[str, Any]:
    """Monitor data quality across all processed tables"""
    logger.info("Monitoring data quality...")

    postgres_hook = PostgresHook(postgres_conn_id='postgres_default')
    quality_metrics = {}

    # List of tables to monitor
    tables_to_monitor = ['processed_data_pandas', 'processed_data_polars']

    for table in tables_to_monitor:
        try:
            # Check if table exists
            table_exists_query = f"""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = '{table}'
            );
            """

            table_exists = postgres_hook.get_first(table_exists_query)[0]

            if not table_exists:
                quality_metrics[table] = {'exists': False, 'quality_score': 0}
                continue

            # Data quality checks
            quality_check_query = f"""
            SELECT
                COUNT(*) as total_rows,
                COUNT(CASE WHEN id IS NULL THEN 1 END) as null_ids,
                COUNT(CASE WHEN value IS NULL THEN 1 END) as null_values,
                COUNT(CASE WHEN timestamp IS NULL THEN 1 END) as null_timestamps,
                COUNT(DISTINCT category) as unique_categories,
                MIN(amount) as min_amount,
                MAX(amount) as max_amount,
                AVG(amount) as avg_amount
            FROM {table}
            WHERE created_at >= NOW() - INTERVAL '1 hour';
            """

            result = postgres_hook.get_first(quality_check_query)

            if result and result[0] > 0:
                total_rows, null_ids, null_values, null_timestamps, unique_categories, min_amount, max_amount, avg_amount = result

                # Calculate quality score
                null_percentage = (null_ids + null_values + null_timestamps) / (total_rows * 3)
                quality_score = max(0, 1.0 - null_percentage)

                quality_metrics[table] = {
                    'exists': True,
                    'total_rows': total_rows,
                    'null_percentage': null_percentage,
                    'quality_score': quality_score,
                    'unique_categories': unique_categories,
                    'amount_stats': {
                        'min': float(min_amount) if min_amount else 0,
                        'max': float(max_amount) if max_amount else 0,
                        'avg': float(avg_amount) if avg_amount else 0
                    }
                }

                # Record quality metrics
                prometheus_metrics.record_data_quality(
                    dag_id='large_data_etl_pipeline',
                    task_id='data_quality_monitoring',
                    table=table,
                    quality_score=quality_score
                )

            else:
                quality_metrics[table] = {'exists': True, 'total_rows': 0, 'quality_score': 1.0}

        except Exception as e:
            logger.error(f"Error monitoring table {table}: {e}")
            quality_metrics[table] = {'exists': False, 'error': str(e), 'quality_score': 0}

    logger.info(f"Data quality monitoring completed for {len(tables_to_monitor)} tables")
    return {
        'monitoring_timestamp': datetime.now().isoformat(),
        'table_metrics': quality_metrics
    }


@task
def check_system_health(**context) -> Dict[str, Any]:
    """Check overall system health"""
    logger.info("Checking system health...")

    import psutil

    # System resource metrics
    memory = psutil.virtual_memory()
    cpu_percent = psutil.cpu_percent(interval=1)
    disk_usage = psutil.disk_usage('/')

    # Database connectivity test
    postgres_hook = PostgresHook(postgres_conn_id='postgres_default')
    db_healthy = True
    db_response_time = None

    try:
        start_time = datetime.now()
        postgres_hook.get_first("SELECT 1;")
        db_response_time = (datetime.now() - start_time).total_seconds()
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_healthy = False

    # Airflow scheduler health (simplified check)
    scheduler_healthy = True  # In real implementation, check scheduler heartbeat

    health_metrics = {
        'timestamp': datetime.now().isoformat(),
        'system_resources': {
            'memory_percent': memory.percent,
            'memory_available_gb': memory.available / (1024**3),
            'cpu_percent': cpu_percent,
            'disk_percent': disk_usage.percent,
            'disk_free_gb': disk_usage.free / (1024**3)
        },
        'services': {
            'database': {
                'healthy': db_healthy,
                'response_time_seconds': db_response_time
            },
            'scheduler': {
                'healthy': scheduler_healthy
            }
        },
        'overall_health': 'healthy' if all([
            memory.percent < 90,
            cpu_percent < 90,
            disk_usage.percent < 90,
            db_healthy,
            scheduler_healthy
        ]) else 'degraded'
    }

    # Record system metrics
    prometheus_metrics.record_system_metrics('main_worker')

    logger.info(f"System health check completed: {health_metrics['overall_health']}")
    return health_metrics


@task
def process_alerts(pipeline_metrics: Dict[str, Any],
                  quality_metrics: Dict[str, Any],
                  health_metrics: Dict[str, Any], **context) -> Dict[str, Any]:
    """Process all metrics and trigger alerts if necessary"""
    logger.info("Processing alerts...")

    # Combine all metrics
    combined_metrics = {
        **pipeline_metrics,
        **health_metrics['system_resources'],
        'data_quality_scores': {
            table: metrics.get('quality_score', 0)
            for table, metrics in quality_metrics['table_metrics'].items()
        }
    }

    # Add specific alert conditions
    combined_metrics.update({
        'dag_id': 'large_data_etl_pipeline',
        'sla_violations': 0,  # Would calculate from actual SLA checks
        'alert_recipients': Variable.get('ALERT_EMAIL_RECIPIENTS', default_var='admin@company.com')
    })

    # Process alerts asynchronously
    import asyncio
    alert_results = asyncio.run(alert_manager.process_metrics_and_alerts(combined_metrics))

    # Get alert statistics
    alert_stats = alert_manager.get_alert_statistics()

    logger.info(f"Alert processing completed. Recent alerts: {alert_stats['recent_alerts_24h']}")

    return {
        'alert_processing_timestamp': datetime.now().isoformat(),
        'metrics_processed': len(combined_metrics),
        'alert_statistics': alert_stats
    }


@task
def generate_monitoring_report(pipeline_metrics: Dict[str, Any],
                             quality_metrics: Dict[str, Any],
                             health_metrics: Dict[str, Any],
                             alert_results: Dict[str, Any], **context) -> Dict[str, Any]:
    """Generate comprehensive monitoring report"""
    logger.info("Generating monitoring report...")

    # Calculate summary statistics
    total_dag_runs = pipeline_metrics['dag_statistics']['successful_runs_24h'] + pipeline_metrics['dag_statistics']['failed_runs_24h']
    success_rate = pipeline_metrics['dag_statistics']['successful_runs_24h'] / max(1, total_dag_runs)

    avg_quality_score = sum(
        metrics.get('quality_score', 0)
        for metrics in quality_metrics['table_metrics'].values()
    ) / max(1, len(quality_metrics['table_metrics']))

    report = {
        'report_timestamp': datetime.now().isoformat(),
        'monitoring_period': '24 hours',
        'executive_summary': {
            'total_pipeline_runs': total_dag_runs,
            'success_rate': success_rate,
            'average_data_quality_score': avg_quality_score,
            'system_health_status': health_metrics['overall_health'],
            'recent_alerts': alert_results['alert_statistics']['recent_alerts_24h']
        },
        'detailed_metrics': {
            'pipeline_performance': pipeline_metrics,
            'data_quality': quality_metrics,
            'system_health': health_metrics,
            'alerting': alert_results
        },
        'recommendations': []
    }

    # Generate recommendations based on metrics
    if success_rate < 0.9:
        report['recommendations'].append("Review failed pipeline runs and implement additional error handling")

    if avg_quality_score < 0.8:
        report['recommendations'].append("Investigate data quality issues and implement stronger validation")

    if health_metrics['system_resources']['memory_percent'] > 80:
        report['recommendations'].append("Consider scaling up system resources")

    if alert_results['alert_statistics']['critical_alerts'] > 0:
        report['recommendations'].append("Address critical alerts immediately")

    logger.info("Monitoring report generated successfully")
    return report


# Task Groups
with TaskGroup("metrics_collection", dag=monitoring_dag) as metrics_group:
    pipeline_metrics_task = collect_pipeline_metrics()
    quality_monitoring_task = monitor_data_quality()
    health_check_task = check_system_health()

with TaskGroup("alerting", dag=monitoring_dag) as alerting_group:
    alert_processing_task = process_alerts(
        pipeline_metrics_task,
        quality_monitoring_task,
        health_check_task
    )

with TaskGroup("reporting", dag=monitoring_dag) as reporting_group:
    monitoring_report_task = generate_monitoring_report(
        pipeline_metrics_task,
        quality_monitoring_task,
        health_check_task,
        alert_processing_task
    )

# Task dependencies
metrics_group >> alerting_group >> reporting_group
