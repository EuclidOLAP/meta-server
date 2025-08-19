export const ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET ||
  "3ffce944728a1e1dc2ab36c69455920b81873d33431de611e263b2313900450e";
export const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET ||
  "1243818cc51e24cd78ef2dde769b19d743a7d8ed680c06fcfa6beb9793ecbc40";
export const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "15m";
export const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || "7d";
