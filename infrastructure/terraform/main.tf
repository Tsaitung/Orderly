# =============================================================================
# Orderly Hello World Infrastructure - Simplified
# =============================================================================

terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# =============================================================================
# Variables
# =============================================================================
variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "orderly-472413"
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "asia-east1"
}

variable "environment" {
  description = "Environment (staging/production)"
  type        = string
  default     = "staging"
}

# =============================================================================
# Provider Configuration
# =============================================================================
provider "google" {
  project = var.project_id
  region  = var.region
}

# =============================================================================
# Enable Required APIs
# =============================================================================
resource "google_project_service" "required_apis" {
  for_each = toset([
    "run.googleapis.com",
    "containerregistry.googleapis.com",
    "cloudbuild.googleapis.com"
  ])

  project = var.project_id
  service = each.value

  disable_dependent_services = false
  disable_on_destroy        = false
}

# =============================================================================
# Cloud Run Services
# =============================================================================

# User Service
resource "google_cloud_run_service" "user_service" {
  name     = "orderly-user-service-${var.environment}"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/orderly-user-service:latest"
        
        ports {
          container_port = 8001
        }

        env {
          name  = "NODE_ENV"
          value = var.environment
        }

        env {
          name  = "JWT_SECRET"
          value = var.environment == "production" ? "CHANGE_IN_PRODUCTION" : "staging-jwt-secret"
        }

        resources {
          limits = {
            cpu    = var.environment == "production" ? "2000m" : "1000m"
            memory = var.environment == "production" ? "1Gi" : "512Mi"
          }
        }
      }
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale" = var.environment == "production" ? "1" : "0"
        "autoscaling.knative.dev/maxScale" = var.environment == "production" ? "100" : "10"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [google_project_service.required_apis]
}

# API Gateway
resource "google_cloud_run_service" "api_gateway" {
  name     = "orderly-api-gateway-${var.environment}"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/orderly-api-gateway:latest"
        
        ports {
          container_port = 3000
        }

        env {
          name  = "NODE_ENV"
          value = var.environment
        }

        env {
          name  = "JWT_SECRET"
          value = var.environment == "production" ? "CHANGE_IN_PRODUCTION" : "staging-jwt-secret"
        }

        env {
          name  = "USER_SERVICE_URL"
          value = google_cloud_run_service.user_service.status[0].url
        }

        resources {
          limits = {
            cpu    = var.environment == "production" ? "2000m" : "1000m"
            memory = var.environment == "production" ? "2Gi" : "1Gi"
          }
        }
      }
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale" = var.environment == "production" ? "1" : "0"
        "autoscaling.knative.dev/maxScale" = var.environment == "production" ? "100" : "10"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [google_cloud_run_service.user_service]
}

# Frontend
resource "google_cloud_run_service" "frontend" {
  name     = "orderly-frontend-${var.environment}"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/orderly-frontend:latest"
        
        ports {
          container_port = 8000
        }

        env {
          name  = "NODE_ENV"
          value = var.environment
        }

        env {
          name  = "NEXT_PUBLIC_API_BASE_URL"
          value = "${google_cloud_run_service.api_gateway.status[0].url}/api"
        }

        resources {
          limits = {
            cpu    = var.environment == "production" ? "2000m" : "1000m"
            memory = var.environment == "production" ? "2Gi" : "1Gi"
          }
        }
      }
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale" = var.environment == "production" ? "1" : "0"
        "autoscaling.knative.dev/maxScale" = var.environment == "production" ? "100" : "10"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [google_cloud_run_service.api_gateway]
}

# =============================================================================
# IAM for Public Access
# =============================================================================
resource "google_cloud_run_service_iam_member" "user_service_public" {
  location = google_cloud_run_service.user_service.location
  project  = google_cloud_run_service.user_service.project
  service  = google_cloud_run_service.user_service.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_service_iam_member" "api_gateway_public" {
  location = google_cloud_run_service.api_gateway.location
  project  = google_cloud_run_service.api_gateway.project
  service  = google_cloud_run_service.api_gateway.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_service_iam_member" "frontend_public" {
  location = google_cloud_run_service.frontend.location
  project  = google_cloud_run_service.frontend.project
  service  = google_cloud_run_service.frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# =============================================================================
# Outputs
# =============================================================================
output "frontend_url" {
  description = "URL of the deployed frontend service"
  value       = google_cloud_run_service.frontend.status[0].url
}

output "api_gateway_url" {
  description = "URL of the deployed API gateway service"
  value       = google_cloud_run_service.api_gateway.status[0].url
}

output "user_service_url" {
  description = "URL of the deployed user service"
  value       = google_cloud_run_service.user_service.status[0].url
}

output "hello_world_message" {
  description = "Hello World deployment completed"
  value = "🎉 Hello World deployment completed! Visit ${google_cloud_run_service.frontend.status[0].url} to see your application!"
}