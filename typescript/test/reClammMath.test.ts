// pnpm test ./test/reClammMath.test.ts

import { describe, expect, test } from 'vitest';
import {
    computeInitialBalanceRatio,
    computeTheoreticalPriceRatioAndBalances,
} from 'src/reClamm/reClammMath';

describe('test reClammMath', () => {
    test('computeTheoreticalPriceRatioAndBalances', () => {
        // values come from this test:
        // https://github.com/balancer/reclamm/blob/8207b33c1ab76de3c42b015bab5210a8436376de/test/reClammMath.test.ts#L148-L169

        const minPrice = 1000000000000000000000n; // fp(1000)
        const maxPrice = 4000000000000000000000n; // fp(4000)
        const targetPrice = 2500000000000000000000n; // fp(2500)
        const { realBalances } = computeTheoreticalPriceRatioAndBalances(
            minPrice,
            maxPrice,
            targetPrice,
        );

        // const theoreticalBalancesJs = [
        //     264911064067351760000000n,
        //     1162277660168379400000000000n,
        // ];
        const theoreticalBalancesSol = [
            264911064067351732799557n,
            1162277660168379331998893544n,
        ];
        expect(realBalances).toEqual(theoreticalBalancesSol);
    });

    test('computeInitialBalanceRatio', () => {
        // values come from this test:
        // https://github.com/balancer/reclamm/blob/8207b33c1ab76de3c42b015bab5210a8436376de/test/reClammPool.test.ts#L108-L121

        const minPrice = 500000000000000000n; // fp(0.5)
        const maxPrice = 8000000000000000000n; // fp(8)
        const targetPrice = 3000000000000000000n; // fp(3)
        const proportion = computeInitialBalanceRatio(
            minPrice,
            maxPrice,
            targetPrice,
        );
        expect(proportion).toEqual(4579795897113271239n);
    });
});
