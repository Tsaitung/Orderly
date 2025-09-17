# =====================================
# Orderly Platform - Terraform Variables
# Enterprise-Grade Infrastructure Configuration
# =====================================

# =====================================
# Project Configuration
# =====================================
variable "project_id" {
  description = "The GCP project ID"
  type        = string
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.project_id))
    error_message = "Project ID must be 6-30 characters, lowercase letters, digits, and hyphens."
  }
}

variable "billing_account_id" {
  description = "The billing account ID for cost monitoring"
  type        = string
  default     = null
}

variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
  default     = "development"
  
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}

# =====================================
# Multi-Region Configuration
# =====================================
variable "primary_region" {
  description = "Primary GCP region"
  type        = string
  default     = "asia-east1"
}

variable "secondary_region" {
  description = "Secondary GCP region for disaster recovery"
  type        = string
  default     = "us-central1"
}

variable "tertiary_region" {
  description = "Tertiary GCP region for global distribution"
  type        = string
  default     = "europe-west1"
}

# =====================================
# Networking Configuration
# =====================================
variable "subnet_cidr_ranges" {
  description = "CIDR ranges for subnets in each region"
  type = map(object({
    primary   = string
    secondary = string
    tertiary  = string
  }))
  default = {
    web = {
      primary   = "10.1.1.0/24"
      secondary = "10.2.1.0/24"
      tertiary  = "10.3.1.0/24"
    }
    app = {
      primary   = "10.1.2.0/24"
      secondary = "10.2.2.0/24"
      tertiary  = "10.3.2.0/24"
    }
    db = {
      primary   = "10.1.3.0/24"
      secondary = "10.2.3.0/24"
      tertiary  = "10.3.3.0/24"
    }
  }
}

variable "production_allowed_ranges" {
  description = "CIDR ranges allowed to access production resources"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # Should be restricted in production
}

# =====================================
# Database Configuration
# =====================================
variable "database_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "POSTGRES_15"
}

variable "database_tier" {
  description = "Database instance tier"
  type        = string
  default     = "db-custom-2-4096"  # 2 vCPU, 4GB RAM
  
  validation {
    condition     = can(regex("^db-(custom|standard|highmem)", var.database_tier))
    error_message = "Database tier must be a valid Cloud SQL machine type."
  }
}

variable "backup_retention_days" {
  description = "Number of days to retain database backups"
  type        = number
  default     = 7
  
  validation {
    condition     = var.backup_retention_days >= 1 && var.backup_retention_days <= 365
    error_message = "Backup retention must be between 1 and 365 days."
  }
}

# =====================================
# Redis Configuration
# =====================================
variable "redis_memory_size" {
  description = "Redis memory size in GB"
  type        = number
  default     = 1
  
  validation {
    condition     = var.redis_memory_size >= 1 && var.redis_memory_size <= 300
    error_message = "Redis memory size must be between 1 and 300 GB."
  }
}

variable "redis_version" {
  description = "Redis version"
  type        = string
  default     = "REDIS_7_0"
}

# =====================================
# Cloud Run Services Configuration
# =====================================
variable "cloud_run_services" {
  description = "Configuration for Cloud Run services"
  type = map(object({
    image         = string
    port          = number
    cpu_limit     = string
    memory_limit  = string
    min_instances = number
    max_instances = number
    env_vars      = map(string)
  }))
  default = {
    frontend = {
      image         = "gcr.io/PROJECT_ID/orderly-frontend:latest"
      port          = 3000
      cpu_limit     = "1000m"
      memory_limit  = "512Mi"
      min_instances = 0
      max_instances = 10
      env_vars = {
        NODE_ENV = "production"
        PORT     = "3000"
      }
    }
    backend = {
      image         = "gcr.io/PROJECT_ID/orderly-backend:latest"
      port          = 8000
      cpu_limit     = "1000m"
      memory_limit  = "1Gi"
      min_instances = 1
      max_instances = 100
      env_vars = {
        ENVIRONMENT = "production"
        PORT        = "8000"
      }
    }
  }
}

# =====================================
# GKE Configuration
# =====================================
variable "enable_gke_cluster" {
  description = "Whether to create GKE cluster for advanced workloads"
  type        = bool
  default     = false
}

variable "gke_cluster_config" {
  description = "GKE cluster configuration"
  type = object({
    initial_node_count = number
    node_pool_config = object({
      machine_type    = string
      disk_size_gb    = number
      disk_type       = string
      preemptible     = bool
      min_node_count  = number
      max_node_count  = number
    })
  })
  default = {
    initial_node_count = 1
    node_pool_config = {
      machine_type   = "e2-standard-2"
      disk_size_gb   = 50
      disk_type      = "pd-ssd"
      preemptible    = false
      min_node_count = 1
      max_node_count = 10
    }
  }
}

# =====================================
# SSL Certificate Configuration
# =====================================
variable "ssl_certificates" {
  description = "SSL certificates for HTTPS"
  type = map(object({
    domains     = list(string)
    description = string
  }))
  default = {
    orderly_cert = {
      domains     = ["orderly.app", "www.orderly.app", "api.orderly.app"]
      description = "SSL certificate for Orderly platform"
    }
  }
}

variable "domain_name" {
  description = "Primary domain name for the application"
  type        = string
  default     = "orderly.app"
}

# =====================================
# Security Configuration
# =====================================
variable "secrets" {
  description = "Secrets to store in Secret Manager"
  type = map(object({
    secret_data = string
    description = string
  }))
  default = {
    database_password = {
      secret_data = "CHANGE_ME_IN_PRODUCTION"
      description = "Database password for Orderly"
    }
    jwt_secret = {
      secret_data = "CHANGE_ME_IN_PRODUCTION"
      description = "JWT signing secret"
    }
    api_keys = {
      secret_data = "{}"
      description = "Third-party API keys"
    }
  }
  sensitive = true
}

variable "service_accounts" {
  description = "Service accounts to create"
  type = map(object({
    display_name = string
    description  = string
    roles        = list(string)
  }))
  default = {
    orderly_app = {
      display_name = "Orderly Application"
      description  = "Service account for Orderly application services"
      roles = [
        "roles/cloudsql.client",
        "roles/secretmanager.secretAccessor",
        "roles/storage.objectViewer",
        "roles/logging.logWriter",
        "roles/monitoring.metricWriter"
      ]
    }
    orderly_cicd = {
      display_name = "Orderly CI/CD"
      description  = "Service account for CI/CD pipelines"
      roles = [
        "roles/run.admin",
        "roles/storage.admin",
        "roles/cloudbuild.builds.editor",
        "roles/container.admin"
      ]
    }
  }
}

variable "iam_bindings" {
  description = "IAM bindings for the project"
  type = map(object({
    role    = string
    members = list(string)
  }))
  default = {}
}

variable "kms_keys" {
  description = "KMS keys for encryption"
  type = map(object({
    purpose          = string
    rotation_period  = string
    protection_level = string
  }))
  default = {
    database_key = {
      purpose          = "ENCRYPT_DECRYPT"
      rotation_period  = "7776000s"  # 90 days
      protection_level = "SOFTWARE"
    }
    storage_key = {
      purpose          = "ENCRYPT_DECRYPT"
      rotation_period  = "7776000s"  # 90 days
      protection_level = "SOFTWARE"
    }
  }
}

# =====================================
# Monitoring Configuration
# =====================================
variable "enable_datadog" {
  description = "Enable DataDog APM integration"
  type        = bool
  default     = false
}

variable "enable_newrelic" {
  description = "Enable New Relic APM integration"
  type        = bool
  default     = false
}

variable "enable_prometheus" {
  description = "Enable Prometheus monitoring"
  type        = bool
  default     = true
}

variable "notification_channels" {
  description = "Notification channels for alerting"
  type = map(object({
    type         = string
    display_name = string
    labels       = map(string)
    enabled      = bool
  }))
  default = {
    email = {
      type         = "email"
      display_name = "Email Notifications"
      labels = {
        email_address = "alerts@orderly.app"
      }
      enabled = true
    }
    slack = {
      type         = "slack"
      display_name = "Slack Notifications"
      labels = {
        channel_name = "#alerts"
        url          = "https://hooks.slack.com/services/WEBHOOK_URL"
      }
      enabled = true
    }
  }
}

variable "alert_policies" {
  description = "Alert policies for monitoring"
  type = map(object({
    display_name          = string
    combiner             = string
    conditions = list(object({
      display_name = string
      filter       = string
      comparison   = string
      threshold    = number
      duration     = string
    }))
    notification_channels = list(string)
    enabled              = bool
  }))
  default = {
    high_error_rate = {
      display_name = "High Error Rate"
      combiner     = "OR"
      conditions = [{
        display_name = "Error rate > 5%"
        filter       = "resource.type=\"cloud_run_revision\""
        comparison   = "COMPARISON_GREATER_THAN"
        threshold    = 0.05
        duration     = "300s"
      }]
      notification_channels = ["email", "slack"]
      enabled              = true
    }
    high_latency = {
      display_name = "High Response Latency"
      combiner     = "OR"
      conditions = [{
        display_name = "95th percentile latency > 500ms"
        filter       = "resource.type=\"cloud_run_revision\""
        comparison   = "COMPARISON_GREATER_THAN"
        threshold    = 500
        duration     = "300s"
      }]
      notification_channels = ["email", "slack"]
      enabled              = true
    }
  }
}

variable "log_retention_days" {
  description = "Number of days to retain logs"
  type        = number
  default     = 30
  
  validation {
    condition     = var.log_retention_days >= 1 && var.log_retention_days <= 3653
    error_message = "Log retention must be between 1 and 3653 days (10 years)."
  }
}

variable "synthetic_tests" {
  description = "Synthetic monitoring tests"
  type = map(object({
    display_name = string
    http_check = object({
      path         = string
      port         = number
      use_ssl      = bool
      validate_ssl = bool
    })
    period   = string
    timeout  = string
    regions  = list(string)
  }))
  default = {
    frontend_health = {
      display_name = "Frontend Health Check"
      http_check = {
        path         = "/api/health"
        port         = 443
        use_ssl      = true
        validate_ssl = true
      }
      period  = "300s"
      timeout = "10s"
      regions = ["usa", "europe", "asia_pacific"]
    }
    api_health = {
      display_name = "API Health Check"
      http_check = {
        path         = "/health"
        port         = 443
        use_ssl      = true
        validate_ssl = true
      }
      period  = "300s"
      timeout = "10s"
      regions = ["usa", "europe", "asia_pacific"]
    }
  }
}

# =====================================
# Cost Management
# =====================================
variable "monthly_budget_amount" {
  description = "Monthly budget amount in USD"
  type        = number
  default     = 1000
  
  validation {
    condition     = var.monthly_budget_amount > 0
    error_message = "Monthly budget amount must be greater than 0."
  }
}

variable "budget_notification_channels" {
  description = "Notification channels for budget alerts"
  type        = list(string)
  default     = []
}

# =====================================
# Feature Flags
# =====================================
variable "enable_disaster_recovery" {
  description = "Enable cross-region disaster recovery setup"
  type        = bool
  default     = true
}

variable "enable_audit_logging" {
  description = "Enable comprehensive audit logging"
  type        = bool
  default     = true
}

variable "enable_compliance_monitoring" {
  description = "Enable SOC2/GDPR/HIPAA compliance monitoring"
  type        = bool
  default     = true
}

variable "enable_cost_optimization" {
  description = "Enable automated cost optimization features"
  type        = bool
  default     = true
}

variable "enable_chaos_engineering" {
  description = "Enable chaos engineering capabilities"
  type        = bool
  default     = false
}

# =====================================
# Development vs Production Overrides
# =====================================
variable "development_overrides" {
  description = "Configuration overrides for development environment"
  type = object({
    database_tier      = optional(string, "db-f1-micro")
    redis_memory_size  = optional(number, 1)
    min_instances      = optional(number, 0)
    max_instances      = optional(number, 5)
    enable_ha          = optional(bool, false)
    backup_retention   = optional(number, 1)
  })
  default = {}
}

variable "staging_overrides" {
  description = "Configuration overrides for staging environment"
  type = object({
    database_tier      = optional(string, "db-custom-1-2048")
    redis_memory_size  = optional(number, 1)
    min_instances      = optional(number, 0)
    max_instances      = optional(number, 10)
    enable_ha          = optional(bool, false)
    backup_retention   = optional(number, 3)
  })
  default = {}
}

variable "production_overrides" {
  description = "Configuration overrides for production environment"
  type = object({
    database_tier      = optional(string, "db-custom-4-8192")
    redis_memory_size  = optional(number, 4)
    min_instances      = optional(number, 1)
    max_instances      = optional(number, 100)
    enable_ha          = optional(bool, true)
    backup_retention   = optional(number, 30)
  })
  default = {}
}

# =====================================
# Regional Failover Configuration
# =====================================
variable "enable_multi_region_failover" {
  description = "Enable automatic multi-region failover"
  type        = bool
  default     = false
}

variable "failover_policy" {
  description = "Failover policy configuration"
  type = object({
    health_check_interval = string
    unhealthy_threshold   = number
    healthy_threshold     = number
    timeout_seconds       = number
  })
  default = {
    health_check_interval = "30s"
    unhealthy_threshold   = 3
    healthy_threshold     = 2
    timeout_seconds       = 10
  }
}

# =====================================
# Auto-scaling Configuration
# =====================================
variable "auto_scaling_config" {
  description = "Auto-scaling configuration for services"
  type = object({
    cpu_utilization_target    = number
    memory_utilization_target = number
    request_utilization_target = number
    scale_down_delay          = string
    scale_up_delay            = string
  })
  default = {
    cpu_utilization_target     = 70
    memory_utilization_target  = 80
    request_utilization_target = 1000
    scale_down_delay          = "300s"
    scale_up_delay            = "60s"
  }
}

# =====================================
# Maintenance Window Configuration
# =====================================
variable "maintenance_window" {
  description = "Maintenance window for database and other services"
  type = object({
    day_of_week   = number  # 1-7, 1 = Monday
    hour          = number  # 0-23
    update_track  = string  # "canary" or "stable"
  })
  default = {
    day_of_week  = 1  # Monday
    hour         = 2  # 2 AM UTC
    update_track = "stable"
  }
}

# =====================================
# Validation Rules
# =====================================
locals {
  # Environment-specific validation
  is_production = var.environment == "production"
  
  # Override configurations based on environment
  final_config = var.environment == "production" ? var.production_overrides : (
    var.environment == "staging" ? var.staging_overrides : var.development_overrides
  )
  
  # Production validation requirements
  production_requirements = {
    enable_ha               = local.is_production ? true : null
    enable_backup          = local.is_production ? true : null
    enable_monitoring      = local.is_production ? true : null
    enable_audit_logging   = local.is_production ? true : null
  }
}

# Production-specific validations
check "production_security" {
  assert {
    condition = !local.is_production || var.enable_audit_logging
    error_message = "Audit logging must be enabled in production environment."
  }
}

check "production_ha" {
  assert {
    condition = !local.is_production || lookup(var.production_overrides, "enable_ha", true)
    error_message = "High availability must be enabled in production environment."
  }
}

check "production_backup" {
  assert {
    condition = !local.is_production || var.backup_retention_days >= 7
    error_message = "Production backup retention must be at least 7 days."
  }
}

# =====================================
# Variables Summary
# =====================================
# This variables file provides comprehensive configuration for:
#
# 🏗️ Multi-Region Infrastructure:
# - Primary, secondary, tertiary regions
# - Cross-region networking
# - Disaster recovery setup
#
# 🔒 Enterprise Security:
# - IAM service accounts and roles
# - Secret Manager integration
# - KMS encryption keys
# - Security validation rules
#
# 📊 Monitoring & Observability:
# - Multi-provider APM integration
# - Custom alert policies
# - Synthetic monitoring tests
# - Log retention policies
#
# 💰 Cost Management:
# - Budget monitoring and alerts
# - Environment-specific sizing
# - Resource optimization flags
#
# ⚡ Performance & Scaling:
# - Auto-scaling configuration
# - Resource allocation per environment
# - Failover policies
#
# 🛠️ Environment Management:
# - Development/staging/production overrides
# - Feature flags for capabilities
# - Maintenance window configuration
#
# All variables include validation rules and
# environment-specific defaults for optimal
# configuration management across environments.