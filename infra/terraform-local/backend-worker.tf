resource "kubernetes_deployment" "invoice_worker" {
  metadata {
    name      = "invoice-worker"
    namespace = kubernetes_namespace.invoice_triage.metadata[0].name
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "invoice-worker"
      }
    }

    template {
      metadata {
        labels = {
          app = "invoice-worker"
        }
      }

      spec {
        container {
          name              = "worker"
          image             = "jalajkumarr/invoice-triage-backend:23"
          image_pull_policy = "Always"
          command           = ["node", "dist/queue/worker.js"]

          port {
            container_port = 9100
            name           = "metrics"
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
            name  = "LLM_PROVIDER"
            value = "mock"
          }
          env {
            name  = "WORKER_CONCURRENCY"
            value = "5"
          }
          env {
            name  = "METRICS_PORT"
            value = "9100"
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
        }
      }
    }
  }
}

resource "kubernetes_service" "invoice_worker" {
  metadata {
    name      = "invoice-worker"
    namespace = kubernetes_namespace.invoice_triage.metadata[0].name
    labels = {
      app = "invoice-worker"
    }
  }

  spec {
    selector = {
      app = "invoice-worker"
    }

    port {
      name        = "metrics"
      port        = 9100
      target_port = 9100
    }
  }
}
