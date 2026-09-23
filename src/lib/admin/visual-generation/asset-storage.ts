/**
 * Asset storage boundary.
 *
 * Separates provider result (potentially expiring URL) from stable Jalin asset.
 *
 * Magnific result → asset storage adapter → stable Jalin asset reference.
 *
 * If production storage is not ready, provider URL is captured temporarily
 * but clearly marked as non-final (asset_finalized = false) and cannot be
 * attached/published until finalized.
 */

export interface AssetStorageResult {
  /** Stable asset path/URL usable by Jalin (public asset path). */
  stableAssetPath: string | null;
  /** True if the asset has been persisted to stable storage. */
  finalized: boolean;
  /** Original provider URL (may expire). Kept for provenance only. */
  providerAssetUrl: string;
}

/**
 * Attempt to persist a provider asset to stable storage.
 *
 * Current strategy: copy provider result into public/assets/visuals/.
 * If storage is not available, return finalized = false — the provider URL
 * is captured temporarily but must NOT be attached/published.
 *
 * TODO(4D-6+): Replace with production storage adapter (R2/S3) when ready.
 */
export async function storeVisualAsset(
  providerAssetUrl: string,
  visualRequestId: number,
  mimeType: string = "image/png"
): Promise<AssetStorageResult> {
  if (!providerAssetUrl) {
    return { stableAssetPath: null, finalized: false, providerAssetUrl };
  }

  try {
    const ext = mimeType.split("/")[1] || "png";
    const stablePath = `/assets/visuals/vr-${visualRequestId}.${ext}`;

    // Attempt to download and persist to public/assets/visuals/
    const response = await fetch(providerAssetUrl, {
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      return { stableAssetPath: null, finalized: false, providerAssetUrl };
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const fs = await import("fs/promises");
    const path = await import("path");

    const publicDir = path.join(process.cwd(), "public", "assets", "visuals");
    await fs.mkdir(publicDir, { recursive: true });

    const filePath = path.join(publicDir, `vr-${visualRequestId}.${ext}`);
    await fs.writeFile(filePath, buffer);

    return {
      stableAssetPath: stablePath,
      finalized: true,
      providerAssetUrl,
    };
  } catch {
    // Storage unavailable — provider URL is temporary, NOT final.
    return { stableAssetPath: null, finalized: false, providerAssetUrl };
  }
}
