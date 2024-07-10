/**
 * Simplified version of RayMath that instead of half-up rounding does explicit rounding in a specified direction.
 * This is needed to have a 4626 complient implementation, that always predictable rounds in favor of the vault / static a token.
 */
const RAY = 1000000000000000000000000000n;
const WAD_RAY_RATIO = 1000000000n;

export class RayMathExplicitRounding {
  static rayMulRoundDown(a: bigint, b: bigint): bigint {
    if (a === 0n || b === 0n) {
      return 0n;
    }
    return (a * b) / RAY;
  }

  static rayMulRoundUp(a: bigint, b: bigint): bigint {
    if (a === 0n || b === 0n) {
      return 0n;
    }
    return (a * b + RAY - 1n) / RAY;
  }

  static rayDivRoundDown(a: bigint, b: bigint): bigint {
    return (a * RAY) / b;
  }

  static rayDivRoundUp(a: bigint, b: bigint): bigint {
    return (a * RAY + b - 1n) / b;
  }

  static rayToWadRoundDown(a: bigint): bigint {
    return a / WAD_RAY_RATIO;
  }
}
