import { GyroPoolMath } from './gyroPoolMath';
import { SignedFixedPoint } from './signedFixedPoint';
import {_require} from '../utils/math';

export interface Vector2 {
    x: bigint;
    y: bigint;
}

interface QParams {
    a: bigint;
    b: bigint;
    c: bigint;
}

class MaxBalancesExceededError extends Error {
    constructor() {
        super('Max assets exceeded');
        this.name = 'MaxBalancesExceededError';
    }
}

class MaxInvariantExceededError extends Error {
    constructor() {
        super('Max invariant exceeded');
        this.name = 'MaxInvariantExceededError';
    }
}

// Structs as interfaces
export interface EclpParams {
    alpha: bigint;
    beta: bigint;
    c: bigint;
    s: bigint;
    lambda: bigint;
}

export interface DerivedEclpParams {
    tauAlpha: Vector2;
    tauBeta: Vector2;
    u: bigint;
    v: bigint;
    w: bigint;
    z: bigint;
    dSq: bigint;
}

export class GyroECLPMath {
    static readonly _ONEHALF = BigInt('500000000000000000'); // 0.5e18
    static readonly _ONE = BigInt('1000000000000000000'); // 1e18
    static readonly _ONE_XP = BigInt('100000000000000000000000000000000000000'); // 1e38

    // Anti-overflow limits: Params and DerivedParams (static, only needs to be checked on pool creation)
    static readonly _ROTATION_VECTOR_NORM_ACCURACY = BigInt('1000'); // 1e3 (1e-15 in normal precision)
    static readonly _MAX_STRETCH_FACTOR = BigInt('100000000000000000000000000'); // 1e26 (1e8 in normal precision)
    static readonly _DERIVED_TAU_NORM_ACCURACY_XP = BigInt(
        '100000000000000000000000',
    ); // 1e23 (1e-15 in extra precision)
    static readonly _MAX_INV_INVARIANT_DENOMINATOR_XP = BigInt(
        '10000000000000000000000000000000000000000000',
    ); // 1e43 (1e5 in extra precision)
    static readonly _DERIVED_DSQ_NORM_ACCURACY_XP = BigInt(
        '100000000000000000000000',
    ); // 1e23 (1e-15 in extra precision)

    // Anti-overflow limits: Dynamic values (checked before operations that use them)
    static readonly _MAX_BALANCES = BigInt(
        '100000000000000000000000000000000000',
    ); // 1e34 (1e16 in normal precision)
    static readonly _MAX_INVARIANT = BigInt(
        '3000000000000000000000000000000000000',
    ); // 3e37 (3e19 in normal precision)

    // Invariant growth limit: non-proportional add cannot cause the invariant to increase by more than this ratio
    static readonly MIN_INVARIANT_RATIO = BigInt('600000000000000000'); // 60e16 (60%)
    // Invariant shrink limit: non-proportional remove cannot cause the invariant to decrease by less than this ratio
    static readonly MAX_INVARIANT_RATIO = BigInt('5000000000000000000'); // 500e16 (500%)

    static validateParams(params: EclpParams): void {
        _require(0 <= params.s && params.s <= this._ONE, `s must be >= 0 and <= ${this._ONE}`);
        _require(0 <= params.c && params.c <= this._ONE, `c must be >= 0 and <= ${this._ONE}`);

        const sc:Vector2 = {x: params.s, y: params.c};
        const scnorm2 = this.scalarProd(sc, sc);

        _require(this._ONE - this._ROTATION_VECTOR_NORM_ACCURACY <= scnorm2 && scnorm2 <= this._ONE + this._ROTATION_VECTOR_NORM_ACCURACY, 'RotationVectorNotNormalized()');
        _require(0 <= params.lambda && params.lambda <= this._MAX_STRETCH_FACTOR,`lambda must be >= 0 and <= ${this._MAX_STRETCH_FACTOR}`);
    }


    static validateDerivedParams(params: EclpParams, derived: DerivedEclpParams): void {
        _require(derived.tauAlpha.y > 0, 'tuaAlpha.y must be > 0');
        _require(derived.tauBeta.y > 0, 'tauBeta.y must be > 0');
        _require(derived.tauBeta.x > derived.tauAlpha.x, 'tauBeta.x must be > tauAlpha.x');

        const norm2 = this.scalarProdXp(derived.tauAlpha, derived.tauAlpha);

        _require(this._ONE_XP - this._DERIVED_TAU_NORM_ACCURACY_XP <= norm2 && norm2 <= this._ONE_XP + this._DERIVED_TAU_NORM_ACCURACY_XP, 'RotationVectorNotNormalized()')
        _require(derived.u <= this._ONE_XP, `u must be <= ${this._ONE_XP}`);
        _require(derived.v <= this._ONE_XP, `v must be <= ${this._ONE_XP}`);
        _require(derived.w <= this._ONE_XP, `w must be <= ${this._ONE_XP}`);
        _require(derived.z <= this._ONE_XP, `z must be <= ${this._ONE_XP}`);

        _require(this._ONE_XP - this._DERIVED_DSQ_NORM_ACCURACY_XP <= derived.dSq && derived.dSq <= this._ONE_XP + this._DERIVED_DSQ_NORM_ACCURACY_XP, "DerivedDsqWrong()");

        const mulDenominator = SignedFixedPoint.divXpU(this._ONE_XP, (this.calcAChiAChiInXp(params, derived) - this._ONE_XP));
        _require(mulDenominator <= this._MAX_INV_INVARIANT_DENOMINATOR_XP, `mulDenominator must be <= ${this._MAX_INV_INVARIANT_DENOMINATOR_XP}`);
    }

    static scalarProd(t1: Vector2, t2: Vector2): bigint {
        const xProd = SignedFixedPoint.mulDownMag(t1.x, t2.x);
        const yProd = SignedFixedPoint.mulDownMag(t1.y, t2.y);
        return xProd + yProd;
    }

    static scalarProdXp(t1: Vector2, t2: Vector2): bigint {
        return (
            SignedFixedPoint.mulXp(t1.x, t2.x) +
            SignedFixedPoint.mulXp(t1.y, t2.y)
        );
    }

    static mulA(params: EclpParams, tp: Vector2): Vector2 {
        return {
            x: SignedFixedPoint.divDownMagU(
                SignedFixedPoint.mulDownMagU(params.c, tp.x) -
                    SignedFixedPoint.mulDownMagU(params.s, tp.y),
                params.lambda,
            ),
            y:
                SignedFixedPoint.mulDownMagU(params.s, tp.x) +
                SignedFixedPoint.mulDownMagU(params.c, tp.y),
        };
    }

    static virtualOffset0(
        p: EclpParams,
        d: DerivedEclpParams,
        r: Vector2,
    ): bigint {
        const termXp = SignedFixedPoint.divXpU(d.tauBeta.x, d.dSq);
        let a: bigint;

        if (d.tauBeta.x > 0n) {
            a = SignedFixedPoint.mulUpXpToNpU(
                SignedFixedPoint.mulUpMagU(
                    SignedFixedPoint.mulUpMagU(r.x, p.lambda),
                    p.c,
                ),
                termXp,
            );
        } else {
            a = SignedFixedPoint.mulUpXpToNpU(
                SignedFixedPoint.mulDownMagU(
                    SignedFixedPoint.mulDownMagU(r.y, p.lambda),
                    p.c,
                ),
                termXp,
            );
        }

        return (
            a +
            SignedFixedPoint.mulUpXpToNpU(
                SignedFixedPoint.mulUpMagU(r.x, p.s),
                SignedFixedPoint.divXpU(d.tauBeta.y, d.dSq),
            )
        );
    }

    static virtualOffset1(
        p: EclpParams,
        d: DerivedEclpParams,
        r: Vector2,
    ): bigint {
        const termXp = SignedFixedPoint.divXpU(d.tauAlpha.x, d.dSq);
        let b: bigint;

        if (d.tauAlpha.x < 0n) {
            b = SignedFixedPoint.mulUpXpToNpU(
                SignedFixedPoint.mulUpMagU(
                    SignedFixedPoint.mulUpMagU(r.x, p.lambda),
                    p.s,
                ),
                -termXp,
            );
        } else {
            b = SignedFixedPoint.mulUpXpToNpU(
                SignedFixedPoint.mulDownMagU(
                    SignedFixedPoint.mulDownMagU(-r.y, p.lambda),
                    p.s,
                ),
                termXp,
            );
        }

        return (
            b +
            SignedFixedPoint.mulUpXpToNpU(
                SignedFixedPoint.mulUpMagU(r.x, p.c),
                SignedFixedPoint.divXpU(d.tauAlpha.y, d.dSq),
            )
        );
    }

    static maxBalances0(
        p: EclpParams,
        d: DerivedEclpParams,
        r: Vector2,
    ): bigint {
        const termXp1 = SignedFixedPoint.divXpU(
            d.tauBeta.x - d.tauAlpha.x,
            d.dSq,
        );
        const termXp2 = SignedFixedPoint.divXpU(
            d.tauBeta.y - d.tauAlpha.y,
            d.dSq,
        );

        const xp = SignedFixedPoint.mulDownXpToNpU(
            SignedFixedPoint.mulDownMagU(
                SignedFixedPoint.mulDownMagU(r.y, p.lambda),
                p.c,
            ),
            termXp1,
        );

        const term2 =
            termXp2 > 0n
                ? SignedFixedPoint.mulDownMagU(r.y, p.s)
                : SignedFixedPoint.mulUpMagU(r.x, p.s);

        return xp + SignedFixedPoint.mulDownXpToNpU(term2, termXp2);
    }

    static maxBalances1(
        p: EclpParams,
        d: DerivedEclpParams,
        r: Vector2,
    ): bigint {
        const termXp1 = SignedFixedPoint.divXpU(
            d.tauBeta.x - d.tauAlpha.x,
            d.dSq,
        );
        const termXp2 = SignedFixedPoint.divXpU(
            d.tauAlpha.y - d.tauBeta.y,
            d.dSq,
        );

        const yp = SignedFixedPoint.mulDownXpToNpU(
            SignedFixedPoint.mulDownMagU(
                SignedFixedPoint.mulDownMagU(r.y, p.lambda),
                p.s,
            ),
            termXp1,
        );

        const term2 =
            termXp2 > 0n
                ? SignedFixedPoint.mulDownMagU(r.y, p.c)
                : SignedFixedPoint.mulUpMagU(r.x, p.c);

        return yp + SignedFixedPoint.mulDownXpToNpU(term2, termXp2);
    }

    static calcAtAChi(
        x: bigint,
        y: bigint,
        p: EclpParams,
        d: DerivedEclpParams,
    ): bigint {
        const dSq2 = SignedFixedPoint.mulXpU(d.dSq, d.dSq);

        // (cx - sy) * (w/lambda + z) / lambda
        //      account for 2 factors of dSq (4 s,c factors)
        const termXp = SignedFixedPoint.divXpU(
            SignedFixedPoint.divDownMagU(
                SignedFixedPoint.divDownMagU(d.w, p.lambda) + d.z,
                p.lambda,
            ),
            dSq2,
        );

        let val = SignedFixedPoint.mulDownXpToNpU(
            SignedFixedPoint.mulDownMagU(x, p.c) -
                SignedFixedPoint.mulDownMagU(y, p.s),
            termXp,
        );

        // (x lambda s + y lambda c) * u, note u > 0
        let termNp =
            SignedFixedPoint.mulDownMagU(
                SignedFixedPoint.mulDownMagU(x, p.lambda),
                p.s,
            ) +
            SignedFixedPoint.mulDownMagU(
                SignedFixedPoint.mulDownMagU(y, p.lambda),
                p.c,
            );
        val =
            val +
            SignedFixedPoint.mulDownXpToNpU(
                termNp,
                SignedFixedPoint.divXpU(d.u, dSq2),
            );

        // (sx+cy) * v, note v > 0
        termNp =
            SignedFixedPoint.mulDownMagU(x, p.s) +
            SignedFixedPoint.mulDownMagU(y, p.c);
        val =
            val +
            SignedFixedPoint.mulDownXpToNpU(
                termNp,
                SignedFixedPoint.divXpU(d.v, dSq2),
            );
        return val;
    }

    static calcAChiAChiInXp(p: EclpParams, d: DerivedEclpParams): bigint {
        const dSq3 = SignedFixedPoint.mulXpU(
            SignedFixedPoint.mulXpU(d.dSq, d.dSq),
            d.dSq,
        );

        let val = SignedFixedPoint.mulUpMagU(
            p.lambda,
            SignedFixedPoint.divXpU(
                SignedFixedPoint.mulXpU(2n * d.u, d.v),
                dSq3,
            ),
        );

        val += SignedFixedPoint.mulUpMagU(
            SignedFixedPoint.mulUpMagU(
                SignedFixedPoint.divXpU(
                    SignedFixedPoint.mulXpU(d.u + 1n, d.u + 1n),
                    dSq3,
                ),
                p.lambda,
            ),
            p.lambda,
        );

        val += SignedFixedPoint.divXpU(SignedFixedPoint.mulXpU(d.v, d.v), dSq3);

        const termXp = SignedFixedPoint.divUpMagU(d.w, p.lambda) + d.z;
        val += SignedFixedPoint.divXpU(
            SignedFixedPoint.mulXpU(termXp, termXp),
            dSq3,
        );

        return val;
    }

    static calculateInvariantWithError(
        balances: bigint[],
        params: EclpParams,
        derived: DerivedEclpParams,
    ): [bigint, bigint] {
        const x = balances[0];
        const y = balances[1];

        if (x + y > this._MAX_BALANCES) {
            throw new MaxBalancesExceededError();
        }

        const atAChi = this.calcAtAChi(x, y, params, derived);
        const invariantResult = this.calcInvariantSqrt(x, y, params, derived);
        const sqrt = invariantResult[0];
        let err = invariantResult[1];

        // Note: the minimum non-zero value of sqrt is 1e-9 since the minimum argument is 1e-18
        if (sqrt > 0) {
            // err + 1 to account for O(eps_np) term ignored before
            err = SignedFixedPoint.divUpMagU(err + 1n, 2n * sqrt);
        } else {
            // In the false case here, the extra precision error does not magnify, and so the error inside the sqrt is
            // O(1e-18)
            // somedayTODO: The true case will almost surely never happen (can it be removed)
            err = err > 0 ? GyroPoolMath.sqrt(err, 5n) : BigInt(1e9);
        }
        // Calculate the error in the numerator, scale the error by 20 to be sure all possible terms accounted for
        err =
            (SignedFixedPoint.mulUpMagU(params.lambda, x + y) / this._ONE_XP +
                err +
                1n) *
            20n;

        const achiachi = this.calcAChiAChiInXp(params, derived);
        // A chi \cdot A chi > 1, so round it up to round denominator up.
        // Denominator uses extra precision, so we do * 1/denominator so we are sure the calculation doesn't overflow.
        const mulDenominator = SignedFixedPoint.divXpU(
            this._ONE_XP,
            achiachi - this._ONE_XP,
        );

        // As alternative, could do, but could overflow: invariant = (AtAChi.add(sqrt) - err).divXp(denominator);
        const invariant = SignedFixedPoint.mulDownXpToNpU(
            atAChi + sqrt - err,
            mulDenominator,
        );
        // Error scales if denominator is small.
        // NB: This error calculation computes the error in the expression "numerator / denominator", but in this code
        // We actually use the formula "numerator * (1 / denominator)" to compute the invariant. This affects this line
        // and the one below.
        err = SignedFixedPoint.mulUpXpToNpU(err, mulDenominator);
        // Account for relative error due to error in the denominator.
        // Error in denominator is O(epsilon) if lambda<1e11, scale up by 10 to be sure we catch it, and add O(eps).
        // Error in denominator is lambda^2 * 2e-37 and scales relative to the result / denominator.
        // Scale by a constant to account for errors in the scaling factor itself and limited compounding.
        // Calculating lambda^2 without decimals so that the calculation will never overflow, the lost precision isn't
        // important.
        err =
            err +
            (SignedFixedPoint.mulUpXpToNpU(invariant, mulDenominator) *
                ((params.lambda * params.lambda) / BigInt(1e36)) *
                40n) /
                this._ONE_XP +
            1n;

        if (invariant + err > this._MAX_INVARIANT) {
            throw new MaxInvariantExceededError();
        }

        return [invariant, err];
    }

    static calcMinAtxAChiySqPlusAtxSq(
        x: bigint,
        y: bigint,
        p: EclpParams,
        d: DerivedEclpParams,
    ): bigint {
        let termNp =
            SignedFixedPoint.mulUpMagU(
                SignedFixedPoint.mulUpMagU(
                    SignedFixedPoint.mulUpMagU(x, x),
                    p.c,
                ),
                p.c,
            ) +
            SignedFixedPoint.mulUpMagU(
                SignedFixedPoint.mulUpMagU(
                    SignedFixedPoint.mulUpMagU(y, y),
                    p.s,
                ),
                p.s,
            );

        termNp =
            termNp -
            SignedFixedPoint.mulDownMagU(
                SignedFixedPoint.mulDownMagU(
                    SignedFixedPoint.mulDownMagU(x, y),
                    p.c * 2n,
                ),
                p.s,
            );

        let termXp =
            SignedFixedPoint.mulXpU(d.u, d.u) +
            SignedFixedPoint.divDownMagU(
                SignedFixedPoint.mulXpU(d.u * 2n, d.v),
                p.lambda,
            ) +
            SignedFixedPoint.divDownMagU(
                SignedFixedPoint.divDownMagU(
                    SignedFixedPoint.mulXpU(d.v, d.v),
                    p.lambda,
                ),
                p.lambda,
            );

        termXp = SignedFixedPoint.divXpU(
            termXp,
            SignedFixedPoint.mulXpU(
                SignedFixedPoint.mulXpU(
                    SignedFixedPoint.mulXpU(d.dSq, d.dSq),
                    d.dSq,
                ),
                d.dSq,
            ),
        );

        let val = SignedFixedPoint.mulDownXpToNpU(-termNp, termXp);

        val =
            val +
            SignedFixedPoint.mulDownXpToNpU(
                SignedFixedPoint.divDownMagU(
                    SignedFixedPoint.divDownMagU(termNp - 9n, p.lambda),
                    p.lambda,
                ),
                SignedFixedPoint.divXpU(SignedFixedPoint.ONE_XP, d.dSq),
            );

        return val;
    }

    static calc2AtxAtyAChixAChiy(
        x: bigint,
        y: bigint,
        p: EclpParams,
        d: DerivedEclpParams,
    ): bigint {
        let termNp = SignedFixedPoint.mulDownMagU(
            SignedFixedPoint.mulDownMagU(
                SignedFixedPoint.mulDownMagU(x, x) -
                    SignedFixedPoint.mulUpMagU(y, y),
                2n * p.c,
            ),
            p.s,
        );

        const xy = SignedFixedPoint.mulDownMagU(y, 2n * x);

        termNp =
            termNp +
            SignedFixedPoint.mulDownMagU(
                SignedFixedPoint.mulDownMagU(xy, p.c),
                p.c,
            ) -
            SignedFixedPoint.mulDownMagU(
                SignedFixedPoint.mulDownMagU(xy, p.s),
                p.s,
            );

        let termXp =
            SignedFixedPoint.mulXpU(d.z, d.u) +
            SignedFixedPoint.divDownMagU(
                SignedFixedPoint.divDownMagU(
                    SignedFixedPoint.mulXpU(d.w, d.v),
                    p.lambda,
                ),
                p.lambda,
            );

        termXp =
            termXp +
            SignedFixedPoint.divDownMagU(
                SignedFixedPoint.mulXpU(d.w, d.u) +
                    SignedFixedPoint.mulXpU(d.z, d.v),
                p.lambda,
            );

        termXp = SignedFixedPoint.divXpU(
            termXp,
            SignedFixedPoint.mulXpU(
                SignedFixedPoint.mulXpU(
                    SignedFixedPoint.mulXpU(d.dSq, d.dSq),
                    d.dSq,
                ),
                d.dSq,
            ),
        );

        return SignedFixedPoint.mulDownXpToNpU(termNp, termXp);
    }

    static calcMinAtyAChixSqPlusAtySq(
        x: bigint,
        y: bigint,
        p: EclpParams,
        d: DerivedEclpParams,
    ): bigint {
        let termNp =
            SignedFixedPoint.mulUpMagU(
                SignedFixedPoint.mulUpMagU(
                    SignedFixedPoint.mulUpMagU(x, x),
                    p.s,
                ),
                p.s,
            ) +
            SignedFixedPoint.mulUpMagU(
                SignedFixedPoint.mulUpMagU(
                    SignedFixedPoint.mulUpMagU(y, y),
                    p.c,
                ),
                p.c,
            );

        termNp =
            termNp +
            SignedFixedPoint.mulUpMagU(
                SignedFixedPoint.mulUpMagU(
                    SignedFixedPoint.mulUpMagU(x, y),
                    p.s * 2n,
                ),
                p.c,
            );

        let termXp =
            SignedFixedPoint.mulXpU(d.z, d.z) +
            SignedFixedPoint.divDownMagU(
                SignedFixedPoint.divDownMagU(
                    SignedFixedPoint.mulXpU(d.w, d.w),
                    p.lambda,
                ),
                p.lambda,
            );

        termXp =
            termXp +
            SignedFixedPoint.divDownMagU(
                SignedFixedPoint.mulXpU(2n * d.z, d.w),
                p.lambda,
            );

        termXp = SignedFixedPoint.divXpU(
            termXp,
            SignedFixedPoint.mulXpU(
                SignedFixedPoint.mulXpU(
                    SignedFixedPoint.mulXpU(d.dSq, d.dSq),
                    d.dSq,
                ),
                d.dSq,
            ),
        );

        let val = SignedFixedPoint.mulDownXpToNpU(-termNp, termXp);

        val =
            val +
            SignedFixedPoint.mulDownXpToNpU(
                termNp - 9n,
                SignedFixedPoint.divXpU(SignedFixedPoint.ONE_XP, d.dSq),
            );

        return val;
    }

    static calcInvariantSqrt(
        x: bigint,
        y: bigint,
        p: EclpParams,
        d: DerivedEclpParams,
    ): [bigint, bigint] {
        let val =
            this.calcMinAtxAChiySqPlusAtxSq(x, y, p, d) +
            this.calc2AtxAtyAChixAChiy(x, y, p, d) +
            this.calcMinAtyAChixSqPlusAtySq(x, y, p, d);

        const err =
            (SignedFixedPoint.mulUpMagU(x, x) +
                SignedFixedPoint.mulUpMagU(y, y)) /
            BigInt('1000000000000000000000000000000000000000'); // 1e38

        val = val > 0n ? GyroPoolMath.sqrt(val, 5n) : 0n;

        return [val, err];
    }

    static calcSpotPrice0in1(
        balances: bigint[],
        params: EclpParams,
        derived: DerivedEclpParams,
        invariant: bigint,
    ): bigint {
        const r: Vector2 = { x: invariant, y: invariant };
        const ab: Vector2 = {
            x: this.virtualOffset0(params, derived, r),
            y: this.virtualOffset1(params, derived, r),
        };
        const vec: Vector2 = {
            x: balances[0] - ab.x,
            y: balances[1] - ab.y,
        };

        const transformedVec = this.mulA(params, vec);
        const pc: Vector2 = {
            x: SignedFixedPoint.divDownMagU(transformedVec.x, transformedVec.y),
            y: this._ONE,
        };

        const pgx = this.scalarProd(
            pc,
            this.mulA(params, { x: this._ONE, y: 0n }),
        );
        return SignedFixedPoint.divDownMag(
            pgx,
            this.scalarProd(pc, this.mulA(params, { x: 0n, y: this._ONE })),
        );
    }

    static checkAssetBounds(
        params: EclpParams,
        derived: DerivedEclpParams,
        invariant: Vector2,
        newBal: bigint,
        assetIndex: number,
    ): void {
        if (assetIndex === 0) {
            const xPlus = this.maxBalances0(params, derived, invariant);
            if (newBal > this._MAX_BALANCES || newBal > xPlus) {
                throw new Error('Asset bounds exceeded');
            }
        } else {
            const yPlus = this.maxBalances1(params, derived, invariant);
            if (newBal > this._MAX_BALANCES || newBal > yPlus) {
                throw new Error('Asset bounds exceeded');
            }
        }
    }

    static calcOutGivenIn(
        balances: bigint[],
        amountIn: bigint,
        tokenInIsToken0: boolean,
        params: EclpParams,
        derived: DerivedEclpParams,
        invariant: Vector2,
    ): bigint {
        const [ixIn, ixOut, calcGiven] = tokenInIsToken0
            ? [0, 1, this.calcYGivenX]
            : [1, 0, this.calcXGivenY];

        const balInNew = balances[ixIn] + amountIn;
        this.checkAssetBounds(params, derived, invariant, balInNew, ixIn);
        const balOutNew = calcGiven.call(
            this,
            balInNew,
            params,
            derived,
            invariant,
        );
        return balances[ixOut] - balOutNew;
    }

    static calcInGivenOut(
        balances: bigint[],
        amountOut: bigint,
        tokenInIsToken0: boolean,
        params: EclpParams,
        derived: DerivedEclpParams,
        invariant: Vector2,
    ): bigint {
        const [ixIn, ixOut, calcGiven] = tokenInIsToken0
            ? [0, 1, this.calcXGivenY] // Note: reversed compared to calcOutGivenIn
            : [1, 0, this.calcYGivenX]; // Note: reversed compared to calcOutGivenIn

        if (amountOut > balances[ixOut]) {
            throw new Error('Asset bounds exceeded');
        }
        const balOutNew = balances[ixOut] - amountOut;
        const balInNew = calcGiven.call(
            this,
            balOutNew,
            params,
            derived,
            invariant,
        );
        this.checkAssetBounds(params, derived, invariant, balInNew, ixIn);
        return balInNew - balances[ixIn];
    }

    static solveQuadraticSwap(
        lambda: bigint,
        x: bigint,
        s: bigint,
        c: bigint,
        r: Vector2,
        ab: Vector2,
        tauBeta: Vector2,
        dSq: bigint,
    ): bigint {
        const lamBar: Vector2 = {
            x:
                SignedFixedPoint.ONE_XP -
                SignedFixedPoint.divDownMagU(
                    SignedFixedPoint.divDownMagU(
                        SignedFixedPoint.ONE_XP,
                        lambda,
                    ),
                    lambda,
                ),
            y:
                SignedFixedPoint.ONE_XP -
                SignedFixedPoint.divUpMagU(
                    SignedFixedPoint.divUpMagU(SignedFixedPoint.ONE_XP, lambda),
                    lambda,
                ),
        };

        const q: QParams = { a: 0n, b: 0n, c: 0n };
        const xp = x - ab.x;

        if (xp > 0n) {
            q.b = SignedFixedPoint.mulUpXpToNpU(
                SignedFixedPoint.mulDownMagU(
                    SignedFixedPoint.mulDownMagU(-xp, s),
                    c,
                ),
                SignedFixedPoint.divXpU(lamBar.y, dSq),
            );
        } else {
            q.b = SignedFixedPoint.mulUpXpToNpU(
                SignedFixedPoint.mulUpMagU(
                    SignedFixedPoint.mulUpMagU(-xp, s),
                    c,
                ),
                SignedFixedPoint.divXpU(lamBar.x, dSq) + 1n,
            );
        }

        const sTerm: Vector2 = {
            x: SignedFixedPoint.divXpU(
                SignedFixedPoint.mulDownMagU(
                    SignedFixedPoint.mulDownMagU(lamBar.y, s),
                    s,
                ),
                dSq,
            ),
            y:
                SignedFixedPoint.divXpU(
                    SignedFixedPoint.mulUpMagU(
                        SignedFixedPoint.mulUpMagU(lamBar.x, s),
                        s,
                    ),
                    dSq + 1n,
                ) + 1n,
        };

        sTerm.x = SignedFixedPoint.ONE_XP - sTerm.x;
        sTerm.y = SignedFixedPoint.ONE_XP - sTerm.y;

        q.c = -this.calcXpXpDivLambdaLambda(x, r, lambda, s, c, tauBeta, dSq);
        q.c =
            q.c +
            SignedFixedPoint.mulDownXpToNpU(
                SignedFixedPoint.mulDownMagU(r.y, r.y),
                sTerm.y,
            );

        q.c = q.c > 0n ? GyroPoolMath.sqrt(q.c, 5n) : 0n;

        if (q.b - q.c > 0n) {
            q.a = SignedFixedPoint.mulUpXpToNpU(
                q.b - q.c,
                SignedFixedPoint.divXpU(SignedFixedPoint.ONE_XP, sTerm.y) + 1n,
            );
        } else {
            q.a = SignedFixedPoint.mulUpXpToNpU(
                q.b - q.c,
                SignedFixedPoint.divXpU(SignedFixedPoint.ONE_XP, sTerm.x),
            );
        }

        return q.a + ab.y;
    }

    static calcXpXpDivLambdaLambda(
        x: bigint,
        r: Vector2,
        lambda: bigint,
        s: bigint,
        c: bigint,
        tauBeta: Vector2,
        dSq: bigint,
    ): bigint {
        const sqVars: Vector2 = {
            x: SignedFixedPoint.mulXpU(dSq, dSq),
            y: SignedFixedPoint.mulUpMagU(r.x, r.x),
        };

        const q: QParams = { a: 0n, b: 0n, c: 0n };
        const termXp = SignedFixedPoint.divXpU(
            SignedFixedPoint.mulXpU(tauBeta.x, tauBeta.y),
            sqVars.x,
        );

        if (termXp > 0n) {
            q.a = SignedFixedPoint.mulUpMagU(sqVars.y, 2n * s);
            q.a = SignedFixedPoint.mulUpXpToNpU(
                SignedFixedPoint.mulUpMagU(q.a, c),
                termXp + 7n,
            );
        } else {
            q.a = SignedFixedPoint.mulDownMagU(r.y, r.y);
            q.a = SignedFixedPoint.mulDownMagU(q.a, 2n * s);
            q.a = SignedFixedPoint.mulUpXpToNpU(
                SignedFixedPoint.mulDownMagU(q.a, c),
                termXp,
            );
        }

        if (tauBeta.x < 0n) {
            q.b = SignedFixedPoint.mulUpXpToNpU(
                SignedFixedPoint.mulUpMagU(
                    SignedFixedPoint.mulUpMagU(r.x, x),
                    2n * c,
                ),
                -SignedFixedPoint.divXpU(tauBeta.x, dSq) + 3n,
            );
        } else {
            q.b = SignedFixedPoint.mulUpXpToNpU(
                SignedFixedPoint.mulDownMagU(
                    SignedFixedPoint.mulDownMagU(-r.y, x),
                    2n * c,
                ),
                SignedFixedPoint.divXpU(tauBeta.x, dSq),
            );
        }
        q.a = q.a + q.b;

        let termXp2 =
            SignedFixedPoint.divXpU(
                SignedFixedPoint.mulXpU(tauBeta.y, tauBeta.y),
                sqVars.x,
            ) + 7n;

        q.b = SignedFixedPoint.mulUpMagU(sqVars.y, s);
        q.b = SignedFixedPoint.mulUpXpToNpU(
            SignedFixedPoint.mulUpMagU(q.b, s),
            termXp2,
        );

        q.c = SignedFixedPoint.mulUpXpToNpU(
            SignedFixedPoint.mulDownMagU(
                SignedFixedPoint.mulDownMagU(-r.y, x),
                2n * s,
            ),
            SignedFixedPoint.divXpU(tauBeta.y, dSq),
        );

        q.b = q.b + q.c + SignedFixedPoint.mulUpMagU(x, x);
        q.b =
            q.b > 0n
                ? SignedFixedPoint.divUpMagU(q.b, lambda)
                : SignedFixedPoint.divDownMagU(q.b, lambda);

        q.a = q.a + q.b;
        q.a =
            q.a > 0n
                ? SignedFixedPoint.divUpMagU(q.a, lambda)
                : SignedFixedPoint.divDownMagU(q.a, lambda);

        termXp2 =
            SignedFixedPoint.divXpU(
                SignedFixedPoint.mulXpU(tauBeta.x, tauBeta.x),
                sqVars.x,
            ) + 7n;
        const val = SignedFixedPoint.mulUpMagU(
            SignedFixedPoint.mulUpMagU(sqVars.y, c),
            c,
        );
        return SignedFixedPoint.mulUpXpToNpU(val, termXp2) + q.a;
    }

    static calcYGivenX(
        x: bigint,
        params: EclpParams,
        d: DerivedEclpParams,
        r: Vector2,
    ): bigint {
        const ab: Vector2 = {
            x: this.virtualOffset0(params, d, r),
            y: this.virtualOffset1(params, d, r),
        };
        return this.solveQuadraticSwap(
            params.lambda,
            x,
            params.s,
            params.c,
            r,
            ab,
            d.tauBeta,
            d.dSq,
        );
    }

    static calcXGivenY(
        y: bigint,
        params: EclpParams,
        d: DerivedEclpParams,
        r: Vector2,
    ): bigint {
        const ba: Vector2 = {
            x: this.virtualOffset1(params, d, r),
            y: this.virtualOffset0(params, d, r),
        };
        return this.solveQuadraticSwap(
            params.lambda,
            y,
            params.c,
            params.s,
            r,
            ba,
            { x: -d.tauAlpha.x, y: d.tauAlpha.y },
            d.dSq,
        );
    }
}
