export interface ProductionHealth {
  appUrlConfigured: boolean;
  stripeSecretConfigured: boolean;
  stripeWebhookSecretConfigured: boolean;
  supabaseAdminConfigured: boolean;
  checkoutSessionsReachable: boolean;
  checkoutSessionsMessage: string;
}

export async function getProductionHealth(): Promise<ProductionHealth | null> {
  try {
    const response = await fetch("/api/health");
    if (!response.ok) return null;
    return (await response.json()) as ProductionHealth;
  } catch {
    return null;
  }
}
