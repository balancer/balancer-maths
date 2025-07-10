import { describe, expect, test } from 'vitest';
import { Vault } from '../src/vault/vault';
import { SwapKind } from '../src/vault/types';

describe('Vault', () => {
    test('getMaxSwapAmount works for RECLAMM pool', () => {
        // Minimal RECLAMM pool state mock
        const poolState = {
            poolType: 'RECLAMM',
            poolAddress: '0x12c2de9522f377b86828f6af01f58c046f814d3c',
            swapFee: 250000000000000n,
            balancesLiveScaled18: [
                3239021481000000000000n,
                6280318439000000000000n,
            ],
            tokenRates: [1000000000000000000n, 1000000000000000000n],
            totalSupply: 37431808905174667155226173n,
            tokens: [
                '0x60a3e35cc302bfa44cb288bc5a4f316fdb1adb42',
                '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
            ],
            scalingFactors: [1000000000000n, 1000000000000n],
            aggregateSwapFee: 500000000000000000n,
            supportsUnbalancedLiquidity: false,
            lastTimestamp: 1751988959n,
            currentTimestamp: 1752134917n,
            lastVirtualBalances: [
                86645279375392931791000000000000000000n,
                100696950322433198293000000000000000000n,
            ],
            dailyPriceShiftBase: 999999197747274347000000000000000000n,
            centerednessMargin: 500000000000000000000000000000000000n,
            startFourthRootPriceRatio: 1011900417200324692000000000000000000n,
            endFourthRootPriceRatio: 1011900417200324692000000000000000000n,
            priceRatioUpdateStartTime: 1751988959n,
            priceRatioUpdateEndTime: 1751988959n,
            hookType: undefined,
        };

        const swapParams = {
            swapKind: SwapKind.GivenIn,
            amountGivenScaled18: 0n,
            balancesLiveScaled18: [
                3239021481000000000000n,
                6280318439000000000000n,
            ],
            tokenRates: [1000000000000000000n, 1000000000000000000n],
            scalingFactors: [1000000000000n, 1000000000000n],
            indexIn: 0,
            indexOut: 1,
        };

        const vault = new Vault();
        const maxSwapAmount = vault.getMaxSwapAmount(swapParams, poolState);

        expect(typeof maxSwapAmount).toBe('bigint');
        expect(maxSwapAmount).toBeGreaterThanOrEqual(0n);
    });
});
