/**
 * Deterministic mock adapter for testing.
 * Returns fixed content — no real API calls, no credits spent.
 */

import type {
  ProviderAdapter,
  GenerateTextRequest,
  GenerateTextResponse,
} from "./adapter";

const MOCK_MANUSCRIPT = `Di bawah langit Senai yang kelabu, Izzat duduk di beranda rumahnya yang lama. Angin bertiup lembut, membawa bau hujan yang sudah lama ditunggu.

"Kau tahu," kata Izzat kepada kucingnya yang sedang membongkok di atas batu nisan pohon mangga, "setiap perkara ada masanya sendiri."

Kucing itu hanya menatapnya dengan mata kuning yang penuh rahsia. Izzat tersenyum. Dia tahu kucing itu tidak memahami kata-katanya, tetapi sekurang-kurangnya ia mendengar.

Di kejauhan, bunyi azan Zohor bergema dari Masjid Putra. Izzat bangkit dari kerusinya, mengambil songkok yang terletak di atas meja, dan berjalan perlahan ke pintu.

"Dunia ini bukan milik kita," bisiknya. "Kita hanya penumpang sementara."

Dan dengan itu, Izzat melangkah keluar ke jalan yang basah, meninggalkan rumah yang menyimpan segala kenangan masa kecilnya di Kuala Lumpur yang semakin berubah."`;

export function createMockAdapter(): ProviderAdapter {
  return {
    providerName: "mock",
    supportedModels: ["mock-v1", "mock-deterministic"],

    isConfigured(): boolean {
      return true;
    },

    async generateText(request: GenerateTextRequest): Promise<GenerateTextResponse> {
      // Simulate a small delay
      await new Promise((resolve) => setTimeout(resolve, 10));

      return {
        content: MOCK_MANUSCRIPT,
        provider: "mock",
        model: request.model,
        requestId: `mock-req-${Date.now()}`,
        usage: {
          inputTokens: 150,
          outputTokens: 450,
          totalTokens: 600,
          estimatedCostCents: 0,
          currency: "usd",
        },
        finishReason: "stop",
        runtimeIdentity: {
          provider: "mock",
          model: request.model,
          requestId: `mock-req-${Date.now()}`,
          verifiedAt: new Date().toISOString(),
          verificationMethod: "test_deterministic",
          confidence: 1.0,
        },
      };
    },

    validateModel(model: string): boolean {
      return this.supportedModels.includes(model);
    },
  };
}
