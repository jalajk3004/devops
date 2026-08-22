resource "kubernetes_deployment" "invoice_frontend" {
  metadata {
    name      = "invoice-frontend"
    namespace = kubernetes_namespace.invoice_triage.metadata[0].name
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "invoice-frontend"
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
          app = "invoice-frontend"
        }
      }

      spec {
        container {
          name              = "frontend"
          image             = "jalajkumarr/invoice-triage-frontend:23" # verify this matches your actual deployed tag
          image_pull_policy = "Always"

          port {
            container_port = 3001
          }

          resources {
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }
            limits = {
              cpu    = "300m"
              memory = "256Mi"
            }
          }

          readiness_probe {
            http_get {
              path = "/api/health"
              port = 3001
            }
            initial_delay_seconds = 5
            period_seconds        = 5
          }

          liveness_probe {
            http_get {
              path = "/api/health"
              port = 3001
            }
            initial_delay_seconds = 10
            period_seconds        = 10
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "invoice_frontend" {
  metadata {
    name      = "invoice-frontend"
    namespace = kubernetes_namespace.invoice_triage.metadata[0].name
  }

  spec {
    selector = {
      app = "invoice-frontend"
    }

    port {
      port        = 3001
      target_port = 3001
    }
  }
}
