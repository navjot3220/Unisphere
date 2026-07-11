import crypto from "crypto";
import QRCode from "qrcode";

/**
 * Digital passes are HMAC-signed so a QR code can't be forged or edited.
 * Payload format: base64url(registrationId.userId.eventId).signature
 */
function hmac(data) {
  return crypto
    .createHmac("sha256", process.env.QR_SECRET)
    .update(data)
    .digest("base64url");
}

export function signPass({ registrationId, userId, eventId }) {
  const payload = Buffer.from(`${registrationId}.${userId}.${eventId}`).toString(
    "base64url"
  );
  return `${payload}.${hmac(payload)}`;
}

export function verifyPass(token) {
  const [payload, signature] = String(token).split(".");
  if (!payload || !signature) return null;
  const expected = hmac(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const [registrationId, userId, eventId] = Buffer.from(payload, "base64url")
    .toString()
    .split(".");
  return { registrationId, userId, eventId };
}

export async function passToDataURL(token) {
  return QRCode.toDataURL(token, { width: 320, margin: 1 });
}
