import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Callable
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests
from prometheus_client import CollectorRegistry, Counter, Histogram, Gauge, push_to_gateway
import psutil
from dataclasses import dataclass, asdict
import threading

logger = logging.getLogger(__name__)


@dataclass
class AlertRule:
    """Alert rule configuration"""
    name: str
    condition: Callable[[Dict[str, Any]], bool]
    severity: str  # 'critical', 'warning', 'info'
    message_template: str
    cooldown_minutes: int = 30
    enabled: bool = True
    last_triggered: Optional[datetime] = None


@dataclass
class MetricData:
    """Metric data structure"""
    name: str
    value: float
    labels: Dict[str, str]
    timestamp: datetime
    metric_type: str  # 'counter', 'gauge', 'histogram'


class PrometheusMetrics:
    """Prometheus metrics collector for Airflow pipelines"""

    def __init__(self, registry: Optional[CollectorRegistry] = None):
        self.registry = registry or CollectorRegistry()
        self.setup_metrics()

    def setup_metrics(self):
        """Initialize Prometheus metrics"""
        # DAG execution metrics
        self.dag_runs_total = Counter(
            'airflow_dag_runs_total',
            'Total number of DAG runs',
            ['dag_id', 'state'],
            registry=self.registry
        )

        self.dag_duration = Histogram(
            'airflow_dag_duration_seconds',
            'DAG execution duration in seconds',
            ['dag_id'],
            registry=self.registry
        )

        self.task_duration = Histogram(
            'airflow_task_duration_seconds',
            'Task execution duration in seconds',
            ['dag_id', 'task_id'],
            registry=self.registry
        )

        self.task_failures = Counter(
            'airflow_task_failures_total',
            'Total number of task failures',
            ['dag_id', 'task_id', 'error_type'],
            registry=self.registry
        )

        # Data processing metrics
        self.records_processed = Counter(
            'data_pipeline_records_processed_total',
            'Total number of records processed',
            ['dag_id', 'task_id', 'data_source'],
            registry=self.registry
        )

        self.data_quality_score = Gauge(
            'data_pipeline_quality_score',
            'Data quality score (0-1)',
            ['dag_id', 'task_id', 'table'],
            registry=self.registry
        )

        # System resource metrics
        self.memory_usage = Gauge(
            'airflow_worker_memory_usage_bytes',
            'Worker memory usage in bytes',
            ['worker_id'],
            registry=self.registry
        )

        self.cpu_usage = Gauge(
            'airflow_worker_cpu_usage_percent',
            'Worker CPU usage percentage',
            ['worker_id'],
            registry=self.registry
        )

        # Custom business metrics
        self.pipeline_sla_violations = Counter(
            'data_pipeline_sla_violations_total',
            'Total number of SLA violations',
            ['dag_id', 'sla_type'],
            registry=self.registry
        )

    def record_dag_run(self, dag_id: str, state: str, duration: float = None):
        """Record DAG run metrics"""
        self.dag_runs_total.labels(dag_id=dag_id, state=state).inc()

        if duration is not None:
            self.dag_duration.labels(dag_id=dag_id).observe(duration)

    def record_task_execution(self, dag_id: str, task_id: str, duration: float, success: bool = True):
        """Record task execution metrics"""
        self.task_duration.labels(dag_id=dag_id, task_id=task_id).observe(duration)

        if not success:
            self.task_failures.labels(
                dag_id=dag_id,
                task_id=task_id,
                error_type='execution_failure'
            ).inc()

    def record_data_processing(self, dag_id: str, task_id: str, data_source: str, record_count: int):
        """Record data processing metrics"""
        self.records_processed.labels(
            dag_id=dag_id,
            task_id=task_id,
            data_source=data_source
        ).inc(record_count)

    def record_data_quality(self, dag_id: str, task_id: str, table: str, quality_score: float):
        """Record data quality metrics"""
        self.data_quality_score.labels(
            dag_id=dag_id,
            task_id=task_id,
            table=table
        ).set(quality_score)

    def record_system_metrics(self, worker_id: str):
        """Record system resource metrics"""
        memory = psutil.virtual_memory()
        cpu_percent = psutil.cpu_percent(interval=1)

        self.memory_usage.labels(worker_id=worker_id).set(memory.used)
        self.cpu_usage.labels(worker_id=worker_id).set(cpu_percent)

    def push_to_gateway(self, gateway_url: str, job_name: str):
        """Push metrics to Prometheus pushgateway"""
        try:
            push_to_gateway(gateway_url, job=job_name, registry=self.registry)
            logger.info(f"Successfully pushed metrics to {gateway_url}")
        except Exception as e:
            logger.error(f"Failed to push metrics to gateway: {e}")


class AlertManager:
    """Advanced alerting system for data pipeline monitoring"""

    def __init__(self,
                 smtp_host: str = None,
                 smtp_port: int = 587,
                 smtp_user: str = None,
                 smtp_password: str = None,
                 webhook_urls: List[str] = None):
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port
        self.smtp_user = smtp_user
        self.smtp_password = smtp_password
        self.webhook_urls = webhook_urls or []

        self.alert_rules: List[AlertRule] = []
        self.alert_history: List[Dict[str, Any]] = []
        self.metrics_buffer: List[MetricData] = []

        self.setup_default_alert_rules()

    def setup_default_alert_rules(self):
        """Setup default alert rules"""
        # High failure rate alert
        self.add_alert_rule(AlertRule(
            name="high_failure_rate",
            condition=lambda metrics: metrics.get('failure_rate', 0) > 0.1,
            severity="critical",
            message_template="High failure rate detected: {failure_rate:.2%} in DAG {dag_id}",
            cooldown_minutes=15
        ))

        # Long running task alert
        self.add_alert_rule(AlertRule(
            name="long_running_task",
            condition=lambda metrics: metrics.get('task_duration', 0) > 3600,  # 1 hour
            severity="warning",
            message_template="Task {task_id} in DAG {dag_id} running for {task_duration:.0f} seconds",
            cooldown_minutes=30
        ))

        # Data quality alert
        self.add_alert_rule(AlertRule(
            name="low_data_quality",
            condition=lambda metrics: metrics.get('data_quality_score', 1.0) < 0.8,
            severity="warning",
            message_template="Low data quality detected: {data_quality_score:.2f} for table {table}",
            cooldown_minutes=60
        ))

        # Memory usage alert
        self.add_alert_rule(AlertRule(
            name="high_memory_usage",
            condition=lambda metrics: metrics.get('memory_usage_percent', 0) > 90,
            severity="critical",
            message_template="High memory usage: {memory_usage_percent:.1f}% on worker {worker_id}",
            cooldown_minutes=10
        ))

        # SLA violation alert
        self.add_alert_rule(AlertRule(
            name="sla_violation",
            condition=lambda metrics: metrics.get('sla_violations', 0) > 0,
            severity="critical",
            message_template="SLA violation in DAG {dag_id}: {sla_violations} violations",
            cooldown_minutes=5
        ))

    def add_alert_rule(self, alert_rule: AlertRule):
        """Add a new alert rule"""
        self.alert_rules.append(alert_rule)
        logger.info(f"Added alert rule: {alert_rule.name}")

    def check_alert_conditions(self, metrics: Dict[str, Any]) -> List[AlertRule]:
        """Check if any alert conditions are met"""
        triggered_alerts = []

        for rule in self.alert_rules:
            if not rule.enabled:
                continue

            # Check cooldown period
            if rule.last_triggered:
                time_since_last = datetime.now() - rule.last_triggered
                if time_since_last < timedelta(minutes=rule.cooldown_minutes):
                    continue

            # Evaluate condition
            try:
                if rule.condition(metrics):
                    rule.last_triggered = datetime.now()
                    triggered_alerts.append(rule)
            except Exception as e:
                logger.error(f"Error evaluating alert rule {rule.name}: {e}")

        return triggered_alerts

    async def send_email_alert(self, alert_rule: AlertRule, metrics: Dict[str, Any]):
        """Send email alert"""
        if not all([self.smtp_host, self.smtp_user, self.smtp_password]):
            logger.warning("SMTP configuration incomplete, cannot send email alert")
            return

        try:
            message = MIMEMultipart()
            message['From'] = self.smtp_user
            message['To'] = metrics.get('alert_recipients', 'admin@company.com')
            message['Subject'] = f"[{alert_rule.severity.upper()}] Data Pipeline Alert: {alert_rule.name}"

            # Format message with metrics
            formatted_message = alert_rule.message_template.format(**metrics)

            # Create HTML body
            html_body = f"""
            <html>
            <body>
                <h2>Data Pipeline Alert</h2>
                <p><strong>Alert:</strong> {alert_rule.name}</p>
                <p><strong>Severity:</strong> {alert_rule.severity}</p>
                <p><strong>Message:</strong> {formatted_message}</p>
                <p><strong>Timestamp:</strong> {datetime.now()}</p>

                <h3>Metrics</h3>
                <pre>{json.dumps(metrics, indent=2, default=str)}</pre>

                <h3>Recommended Actions</h3>
                <ul>
                    <li>Check Airflow UI for detailed logs</li>
                    <li>Verify data source availability</li>
                    <li>Monitor system resources</li>
                    <li>Review recent code changes</li>
                </ul>
            </body>
            </html>
            """

            message.attach(MIMEText(html_body, 'html'))

            # Send email
            server = smtplib.SMTP(self.smtp_host, self.smtp_port)
            server.starttls()
            server.login(self.smtp_user, self.smtp_password)

            text = message.as_string()
            server.sendmail(self.smtp_user, message['To'].split(','), text)
            server.quit()

            logger.info(f"Email alert sent for {alert_rule.name}")

        except Exception as e:
            logger.error(f"Failed to send email alert: {e}")

    async def send_webhook_alert(self, alert_rule: AlertRule, metrics: Dict[str, Any]):
        """Send webhook alert (Slack, Teams, etc.)"""
        if not self.webhook_urls:
            return

        alert_payload = {
            'alert_name': alert_rule.name,
            'severity': alert_rule.severity,
            'message': alert_rule.message_template.format(**metrics),
            'timestamp': datetime.now().isoformat(),
            'metrics': metrics
        }

        for webhook_url in self.webhook_urls:
            try:
                # Format for Slack
                if 'slack.com' in webhook_url:
                    slack_payload = {
                        'text': f"🚨 Data Pipeline Alert: {alert_rule.name}",
                        'attachments': [{
                            'color': 'danger' if alert_rule.severity == 'critical' else 'warning',
                            'fields': [
                                {'title': 'Alert', 'value': alert_rule.name, 'short': True},
                                {'title': 'Severity', 'value': alert_rule.severity, 'short': True},
                                {'title': 'Message', 'value': alert_payload['message'], 'short': False}
                            ]
                        }]
                    }
                    response = requests.post(webhook_url, json=slack_payload)
                else:
                    # Generic webhook
                    response = requests.post(webhook_url, json=alert_payload)

                response.raise_for_status()
                logger.info(f"Webhook alert sent to {webhook_url}")

            except Exception as e:
                logger.error(f"Failed to send webhook alert to {webhook_url}: {e}")

    async def process_metrics_and_alerts(self, metrics: Dict[str, Any]):
        """Process incoming metrics and trigger alerts if necessary"""
        # Check for alert conditions
        triggered_alerts = self.check_alert_conditions(metrics)

        if triggered_alerts:
            logger.warning(f"Triggered {len(triggered_alerts)} alerts")

            # Send alerts concurrently
            alert_tasks = []
            for alert in triggered_alerts:
                alert_tasks.extend([
                    self.send_email_alert(alert, metrics),
                    self.send_webhook_alert(alert, metrics)
                ])

            if alert_tasks:
                await asyncio.gather(*alert_tasks, return_exceptions=True)

        # Store alert history
        for alert in triggered_alerts:
            self.alert_history.append({
                'alert_name': alert.name,
                'severity': alert.severity,
                'timestamp': datetime.now().isoformat(),
                'metrics': metrics.copy()
            })

    def get_alert_statistics(self) -> Dict[str, Any]:
        """Get alert statistics"""
        total_alerts = len(self.alert_history)
        critical_alerts = sum(1 for a in self.alert_history if a['severity'] == 'critical')
        warning_alerts = sum(1 for a in self.alert_history if a['severity'] == 'warning')

        recent_alerts = [
            a for a in self.alert_history
            if datetime.fromisoformat(a['timestamp']) > datetime.now() - timedelta(hours=24)
        ]

        return {
            'total_alerts': total_alerts,
            'critical_alerts': critical_alerts,
            'warning_alerts': warning_alerts,
            'recent_alerts_24h': len(recent_alerts),
            'active_rules': len([r for r in self.alert_rules if r.enabled]),
            'recent_alert_summary': recent_alerts[-10:]  # Last 10 alerts
        }


class PipelineMonitor:
    """Comprehensive pipeline monitoring system"""

    def __init__(self,
                 prometheus_metrics: PrometheusMetrics,
                 alert_manager: AlertManager):
        self.prometheus_metrics = prometheus_metrics
        self.alert_manager = alert_manager
        self.monitoring_active = False
        self.monitoring_thread = None

    def start_monitoring(self, interval_seconds: int = 60):
        """Start background monitoring"""
        if self.monitoring_active:
            logger.warning("Monitoring is already active")
            return

        self.monitoring_active = True

        def monitoring_loop():
            while self.monitoring_active:
                try:
                    self.collect_and_process_metrics()
                    time.sleep(interval_seconds)
                except Exception as e:
                    logger.error(f"Error in monitoring loop: {e}")
                    time.sleep(interval_seconds)

        self.monitoring_thread = threading.Thread(target=monitoring_loop, daemon=True)
        self.monitoring_thread.start()
        logger.info(f"Started pipeline monitoring with {interval_seconds}s interval")

    def stop_monitoring(self):
        """Stop background monitoring"""
        self.monitoring_active = False
        if self.monitoring_thread:
            self.monitoring_thread.join()
        logger.info("Stopped pipeline monitoring")

    def collect_and_process_metrics(self):
        """Collect system metrics and process alerts"""
        try:
            # Collect system metrics
            memory = psutil.virtual_memory()
            cpu_percent = psutil.cpu_percent(interval=1)

            # Record system metrics
            worker_id = f"worker_{psutil.Process().pid}"
            self.prometheus_metrics.record_system_metrics(worker_id)

            # Prepare metrics for alerting
            metrics = {
                'memory_usage_percent': memory.percent,
                'cpu_usage_percent': cpu_percent,
                'worker_id': worker_id,
                'timestamp': datetime.now().isoformat()
            }

            # Process alerts asynchronously
            asyncio.run(self.alert_manager.process_metrics_and_alerts(metrics))

        except Exception as e:
            logger.error(f"Error collecting metrics: {e}")

    def get_monitoring_status(self) -> Dict[str, Any]:
        """Get comprehensive monitoring status"""
        return {
            'monitoring_active': self.monitoring_active,
            'prometheus_metrics': 'active',
            'alert_statistics': self.alert_manager.get_alert_statistics(),
            'system_status': {
                'memory': dict(psutil.virtual_memory()._asdict()),
                'cpu_percent': psutil.cpu_percent(),
                'disk_usage': dict(psutil.disk_usage('/')._asdict()) if hasattr(psutil, 'disk_usage') else {}
            }
        }


# Singleton instances for easy import
prometheus_metrics = PrometheusMetrics()
alert_manager = AlertManager()
pipeline_monitor = PipelineMonitor(prometheus_metrics, alert_manager)
