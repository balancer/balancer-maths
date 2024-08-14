import { MathSol } from '../utils/math';
import { SwapKind } from '../vault/types';
import { WrappingDirection } from './types';

enum Rounding {
    UP = 0,
    DOWN = 1,
}

// See VaultExtension for SC code
export function calculateBufferAmounts(
    direction: WrappingDirection,
    kind: SwapKind,
    amountRaw: bigint,
    rate: bigint,
): bigint {
    if (direction === WrappingDirection.WRAP) {
        // Amount in is underlying tokens, amount out is wrapped tokens
        if (kind === SwapKind.GivenIn) {
            // previewDeposit
            return _convertToShares(amountRaw, rate, Rounding.DOWN);
        } else {
            // previewMint
            return _convertToAssets(amountRaw, rate, Rounding.UP);
        }
    } else {
        // Amount in is wrapped tokens, amount out is underlying tokens
        if (kind === SwapKind.GivenIn) {
            // previewRedeem
            return _convertToAssets(amountRaw, rate, Rounding.DOWN);
        } else {
            // previewWithdraw
            return _convertToShares(amountRaw, rate, Rounding.UP);
        }
    }
}

// https://github.com/bgd-labs/static-a-token-v3/blob/main/src/interfaces/IStaticATokenLM.sol
function _convertToShares(
    assets: bigint,
    rate: bigint,
    rounding: Rounding,
): bigint {
    if (rounding === Rounding.UP) return MathSol.divUpFixed(assets, rate);
    return MathSol.divDownFixed(assets, rate);
}

function _convertToAssets(
    shares: bigint,
    rate: bigint,
    rounding: Rounding,
): bigint {
    if (rounding === Rounding.UP) return MathSol.mulUpFixed(shares, rate);
    return MathSol.mulDownFixed(shares, rate);
}
