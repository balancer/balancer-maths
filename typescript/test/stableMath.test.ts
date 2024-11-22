// pnpm test ./test/stableMath.test.ts

import { _computeBalance, _computeInvariant, _computeInGivenExactOut, _computeOutGivenExactIn } from 'src/stable/stableMath.ts';
import { describe, expect, test } from 'vitest';

describe('test stableMath', () => {
    test('_computeBalance', () => {
        // based on this sim
        // https://dashboard.tenderly.co/mcquardt/project/simulator/f174cf82-3525-4376-b13d-9e61bad1649c?trace=0.4.0
        const finalBalances = _computeBalance(
            1000000n,
            [20099500000000000000000n,20000000000000000000000n], 
            40000000000000000000000n, 
            1
        )
        expect(finalBalances).toEqual(19900500494527739566845n)
    })
    test('_computeInvariant', () => {
        // based on this sim
        // https://dashboard.tenderly.co/mcquardt/project/simulator/f174cf82-3525-4376-b13d-9e61bad1649c?trace=0.4.0
        const invariant = _computeInvariant(
            1000000n,
            [20000000000000000000000n,20000000000000000000000n]
        )
        expect(invariant).toEqual(40000000000000000000000n)
    });
})