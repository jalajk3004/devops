resource "kubernetes_ingress_v1" "invoice_ingress" {
  metadata {
    name      = "invoice-ingress"
    namespace = kubernetes_namespace.invoice_triage.metadata[0].name
  }

  spec {
    ingress_class_name = "nginx"

    rule {
      host = "invoice.local"

      http {
        path {
          path      = "/api"
          path_type = "Prefix"
          backend {
            service {
              name = kubernetes_service.invoice_api.metadata[0].name
              port { number = 3000 }
            }
          }
        }
        path {
          path      = "/healthz"
          path_type = "Exact"
          backend {
            service {
              name = kubernetes_service.invoice_api.metadata[0].name
              port { number = 3000 }
            }
          }
        }
        path {
          path      = "/readyz"
          path_type = "Exact"
          backend {
            service {
              name = kubernetes_service.invoice_api.metadata[0].name
              port { number = 3000 }
            }
          }
        }
        path {
          path      = "/metrics"
          path_type = "Exact"
          backend {
            service {
              name = kubernetes_service.invoice_api.metadata[0].name
              port { number = 3000 }
            }
          }
        }
        path {
          path      = "/"
          path_type = "Prefix"
          backend {
            service {
              name = kubernetes_service.invoice_frontend.metadata[0].name
              port { number = 3001 }
            }
          }
        }
      }
    }
  }
}
