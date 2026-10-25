/**
 * The e-mail that carries a bought code. The wording reuses what the Soalan Lazim already says (checked by ChatGPT, 24 Oct 2026); the
 * whole message should still be read by ChatGPT before purchases are switched on (plan C5). Every value that goes into markup is checked
 * against the exact shape it must have, so nothing can be injected: refuse rather than escape.
 */
import { EMAIL_LOGO_URL } from "../reader-auth/primitives";

export type PurchaseMessageInput = { serial: string; code: string; months: 1 | 6 | 12; redeemByLabel: string; orderReference: string; redeemUrl: string };

const sans = "Inter,Segoe UI,Arial,sans-serif";
const serif = "Georgia,'Times New Roman',serif";
const mono = "Consolas,'SFMono-Regular','Courier New',monospace";

export function purchaseMessage(input: PurchaseMessageInput): { subject: string; text: string; html: string } {
  if (!/^JLN-(01|06|12)B(0[1-9]|1[0-2])\d{2}-M\d{2,5}$/.test(input.serial)) throw new Error("The serial of an e-mailed code must be a virtual serial.");
  if (!/^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){3}-[0-9A-HJKMNP-TV-Z]$/.test(input.code)) throw new Error("The code is not in the printed form.");
  if (![1, 6, 12].includes(input.months)) throw new Error("A code is for 1, 6 or 12 months.");
  if (!/^\d{1,2} [A-Z]{3} \d{4}$/.test(input.redeemByLabel)) throw new Error("The redeem-by label is not in the printed form.");
  if (!/^JP-[0-9A-Z]{10}$/.test(input.orderReference)) throw new Error("The order reference is not in the expected form.");
  if (!/^(https:\/\/[A-Za-z0-9.-]+|http:\/\/localhost:\d{2,5})\/[A-Za-z0-9/_-]*$/.test(input.redeemUrl)) throw new Error("The redeem address is not a plain https address (or localhost, for development).");
  const period = `${input.months} bulan`;
  const subject = `Kod langganan Jalin anda (${period})`;
  const text = [
    "Terima kasih. Pembayaran anda telah diterima.",
    "",
    `Nombor siri: ${input.serial}`,
    `Kod: ${input.code}`,
    `Tempoh: ${period}`,
    `Tebus sebelum: ${input.redeemByLabel}`,
    `Nombor pesanan: ${input.orderReference}`,
    "",
    "Cara menebus:",
    "1. Daftar akaun Jalin atau log masuk jika anda sudah mempunyai akaun.",
    `2. Buka ${input.redeemUrl}.`,
    "3. Masukkan nombor siri dan kod di atas, kemudian tekan \"Tebus kod\".",
    "",
    "Langganan bermula sebaik sahaja penebusan berjaya. Jika anda masih mempunyai percubaan percuma atau langganan yang aktif, tempoh baharu bermula selepas akses semasa tamat.",
    "",
    "Simpan e-mel ini. Nombor siri dan kod hanya boleh ditebus sekali, dan jangan kongsikannya kepada orang lain.",
    "Jika ada masalah, hubungi editorial@adjung.com dan nyatakan nombor pesanan anda. Jangan hantar kod penuh melalui e-mel.",
  ].join("\n");
  const row = (label: string, value: string, big = false) =>
    `<tr><td style="padding:6px 0;font-family:${sans};font-size:13px;color:#dbe3e4;width:120px">${label}</td><td style="padding:6px 0;font-family:${mono};font-size:${big ? 18 : 14}px;letter-spacing:.04em;color:#fbf8f2">${value}</td></tr>`;
  const html = `<!doctype html><html lang="ms"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#fbf8f2">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fbf8f2"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#fffefa;border:1px solid #ddd7cc;border-radius:12px">
<tr><td align="center" style="padding:32px 24px 8px"><img src="${EMAIL_LOGO_URL}" width="96" alt="Jalin" style="display:block;border:0;height:auto;width:96px"></td></tr>
<tr><td align="center" style="padding:20px 32px 4px;font-family:${serif};font-size:22px;line-height:1.3;color:#18343c">Kod langganan anda</td></tr>
<tr><td align="center" style="padding:0 32px 20px;font-family:${sans};font-size:14px;line-height:1.6;color:#52656a">Terima kasih. Pembayaran anda telah diterima.</td></tr>
<tr><td style="padding:0 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#18343c;border-radius:10px"><tr><td style="padding:18px 22px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${row("Nombor siri", input.serial, true)}${row("Kod", input.code, true)}${row("Tempoh", period)}${row("Tebus sebelum", input.redeemByLabel)}${row("Nombor pesanan", input.orderReference)}
</table></td></tr></table></td></tr>
<tr><td style="padding:22px 32px 6px;font-family:${sans};font-size:14px;line-height:1.6;color:#18343c"><strong>Cara menebus</strong><ol style="margin:8px 0 0;padding-left:20px"><li>Daftar akaun Jalin atau log masuk jika anda sudah mempunyai akaun.</li><li>Buka <a href="${input.redeemUrl}" style="color:#a76450">${input.redeemUrl.replace("https://", "")}</a>.</li><li>Masukkan nombor siri dan kod di atas, kemudian tekan &ldquo;Tebus kod&rdquo;.</li></ol></td></tr>
<tr><td style="padding:12px 32px 6px;font-family:${sans};font-size:14px;line-height:1.6;color:#18343c">Langganan bermula sebaik sahaja penebusan berjaya. Jika anda masih mempunyai percubaan percuma atau langganan yang aktif, tempoh baharu bermula selepas akses semasa tamat.</td></tr>
<tr><td style="padding:6px 32px 28px;font-family:${sans};font-size:13px;line-height:1.6;color:#52656a">Simpan e-mel ini. Nombor siri dan kod hanya boleh ditebus sekali, dan jangan kongsikannya kepada orang lain. Jika ada masalah, hubungi editorial@adjung.com dan nyatakan nombor pesanan anda. Jangan hantar kod penuh melalui e-mel.</td></tr>
<tr><td align="center" style="padding:16px 24px;border-top:1px solid #ddd7cc;font-family:${sans};font-size:12px;color:#52656a">Jalin oleh Adjung Press<br>Selami dunia melalui cerita</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, text, html };
}
