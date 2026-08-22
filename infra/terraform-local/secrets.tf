resource "kubernetes_secret" "db_credentials" {
  metadata {
    name      = "db-credentials"
    namespace = kubernetes_namespace.invoice_triage.metadata[0].name
  }

  data = {
    DATABASE_URL      = "postgresql://invoice:invoice@postgres:5432/invoice_triage"
    POSTGRES_USER     = "invoice"
    POSTGRES_PASSWORD = "invoice"
    POSTGRES_DB       = "invoice_triage"
  }

  type = "Opaque"
}
