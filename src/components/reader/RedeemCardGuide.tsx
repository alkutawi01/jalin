import Image from "next/image";

/**
 * The card as the reader holds it, shown above the redeem form so they can see where each box comes from: the batch number is printed
 * on the card, the code is under the scratch sticker. The picture is the real artwork of the back of the card (docs/kad-langganan, made by
 * scripts/kad/jana-kad.mjs) with an example batch number; the glow follows the box the reader is typing in.
 * Positions are percentages of the card (252 x 144 pt), taken from the same layout numbers as the artwork.
 */
export type CardField = "code" | "batch" | null;

export default function RedeemCardGuide({ active, compact = false }: { active: CardField; compact?: boolean }) {
  return (
    <figure className={`card-guide${compact ? " card-guide--compact" : ""}`}>
      <div className="card-guide-art">
        <Image
          src="/kad/kad-belakang-contoh.webp"
          alt="Contoh bahagian belakang kad langganan Jalin: nombor batch tercetak di bahagian atas kotak putih, dan kod di bawah pelekat kikis."
          width={840}
          height={480}
          sizes="(max-width: 480px) 90vw, 420px"
          priority={false}
        />
        <span className={`card-guide-hit card-guide-hit--batch${active === "batch" ? " is-on" : ""}`} aria-hidden="true" />
        <span className={`card-guide-hit card-guide-hit--code${active === "code" ? " is-on" : ""}`} aria-hidden="true" />
      </div>
      <figcaption className="card-guide-caption">
        <span className={active === "batch" ? "is-on" : ""}>Nombor batch: tercetak pada kad</span>
        <span className={active === "code" ? "is-on" : ""}>Kod: di bawah pelekat kikis</span>
      </figcaption>
    </figure>
  );
}
