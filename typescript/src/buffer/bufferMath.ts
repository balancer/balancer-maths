import { MathSol } from '../utils/math';
import { SwapKind } from '../vault/types';
import { WrappingDirection } from './types';

enum Rounding {
    UP = 0,
    DOWN = 1,
}

/*
See VaultExtension for SC code.
Instead of manually adding support for each ERC4626 implementation (e.g. stata with Ray maths)
we always use an 18 decimal scaled rate and do 18 decimal maths to convert. 
We may end up loosing 100% accuracy but thats acceptable.
*/
export function calculateBufferAmounts(
    direction: WrappingDirection,
    kind: SwapKind,
    amountRaw: bigint,
    rate: bigint,
    scalingFactor: bigint,
): bigint {
    if (direction === WrappingDirection.WRAP) {
        // Amount in is underlying tokens, amount out is wrapped tokens
        if (kind === SwapKind.GivenIn) {
            // previewDeposit
            return _convertToShares(
                amountRaw,
                rate,
                scalingFactor,
                Rounding.DOWN,
            );
        } else {
            // previewMint
            return _convertToAssets(
                amountRaw,
                rate,
                scalingFactor,
                Rounding.UP,
            );
        }
    } else {
        // Amount in is wrapped tokens, amount out is underlying tokens
        if (kind === SwapKind.GivenIn) {
            // previewRedeem
            return _convertToAssets(
                amountRaw,
                rate,
                scalingFactor,
                Rounding.DOWN,
            );
        } else {
            // previewWithdraw
            return _convertToShares(
                amountRaw,
                rate,
                scalingFactor,
                Rounding.UP,
            );
        }
    }
}

// https://github.com/bgd-labs/static-a-token-v3/blob/main/src/interfaces/IStaticATokenLM.sol
function _convertToShares(
    assets: bigint,
    rate: bigint,
    scalingFactor: bigint,
    rounding: Rounding,
): bigint {
    const assetsScale18 = assets * scalingFactor;
    if (rounding === Rounding.UP)
        return MathSol.divUpFixed(assetsScale18, rate);
    return MathSol.divDownFixed(assetsScale18, rate);
}

function _convertToAssets(
    shares: bigint,
    rate: bigint,
    scalingFactor: bigint,
    rounding: Rounding,
): bigint {
    const sharesRaw = shares / scalingFactor; // TODO: think a bit about rounding direction
    if (rounding === Rounding.UP) return MathSol.mulUpFixed(sharesRaw, rate);
    return MathSol.mulDownFixed(sharesRaw, rate);
}
