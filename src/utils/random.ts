/** Uniform random integer in [1, sides], using the platform CSPRNG when available. */
export function randomInt(sides: number): number {
  const cryptoObj = (globalThis as { crypto?: Crypto }).crypto;
  if (cryptoObj?.getRandomValues) {
    // Rejection sampling avoids modulo bias.
    const limit = Math.floor(0x100000000 / sides) * sides;
    const buf = new Uint32Array(1);
    do {
      cryptoObj.getRandomValues(buf);
    } while (buf[0] >= limit);
    return (buf[0] % sides) + 1;
  }
  return Math.floor(Math.random() * sides) + 1;
}
