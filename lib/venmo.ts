/**
 * @deprecated All payment logic has moved to lib/payment-apps.ts.
 * This file re-exports the legacy API for backward compatibility.
 */
export {
  getVenmoUsername,
  saveVenmoUsername,
  buildVenmoDeepLink,
  encodePayData,
  decodePayData,
} from "./payment-apps";
