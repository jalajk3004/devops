resource "kubernetes_namespace" "invoice_triage" {
  metadata {
    name = "invoice-triage"
  }
}

resource "kubernetes_namespace" "monitoring" {
  metadata {
    name = "monitoring"
  }
}