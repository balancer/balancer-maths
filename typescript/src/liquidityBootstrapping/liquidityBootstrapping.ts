import { Weighted } from '../weighted/weightedPool';

export class LiquidityBootstrapping extends Weighted {
    constructor(poolState: { weights: bigint[] }) {
        super(poolState);
    }
}
