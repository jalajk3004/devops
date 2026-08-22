resource "kubernetes_deployment" "invoice_api" {
  metadata {
    name      = "invoice-api"
    namespace = kubernetes_namespace.invoice_triage.metadata[0].name
    labels = {
      app = "invoice-api"
    }
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "invoice-api"
      }
    }

    strategy {
      type = "RollingUpdate"
      rolling_update {
        max_surge       = 1
        max_unavailable = 0
      }
    }

    template {
      metadata {
        labels = {
          app = "invoice-api"
        }
      }

      spec {
        container {
          name              = "api"
          image             = "jalajkumarr/invoice-triage-backend:23"
          image_pull_policy = "Always"
          command           = ["node", "dist/index.js"]

          port {
            container_port = 3000
          }

          env_from {
            secret_ref {
              name = kubernetes_secret.db_credentials.metadata[0].name
            }
          }

          env {
            name  = "REDIS_URL"
            value = "redis://redis:6379"
          }
          env {
            name  = "PORT"
            value = "3000"
          }
          env {
            name  = "LLM_PROVIDER"
            value = "mock"
          }
          env {
            name  = "CORS_ORIGIN"
            value = "http://invoice.local"
          }

          resources {
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }
            limits = {
              cpu    = "500m"
              memory = "256Mi"
            }
          }

          readiness_probe {
            http_get {
              path = "/readyz"
              port = 3000
            }
            initial_delay_seconds = 5
            period_seconds        = 5
            failure_threshold     = 3
          }

          liveness_probe {
            http_get {
              path = "/healthz"
              port = 3000
            }
            initial_delay_seconds = 10
            period_seconds        = 10
            failure_threshold     = 3
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "invoice_api" {
  metadata {
    name      = "invoice-api"
    namespace = kubernetes_namespace.invoice_triage.metadata[0].name
    labels = {
      app = "invoice-api" # this is the label that ServiceMonitor needs - learned that one the hard way today
    }
  }

  spec {
    selector = {
      app = "invoice-api"
    }

    port {
      name        = "3000"
      port        = 3000
      target_port = 3000
    }
  }
}
