from dataclasses import dataclass
from typing import List, Tuple

from src.pools.gyro.gyro_pool_math import gyro_pool_math_sqrt
from src.pools.gyro.signed_fixed_point import SignedFixedPoint


@dataclass
class Vector2:
    x: int
    y: int


@dataclass
class QParams:
    a: int
    b: int
    c: int


@dataclass
class EclpParams:
    alpha: int
    beta: int
    c: int
    s: int
    lambda_: int  # Using lambda_ since lambda is a keyword in Python


@dataclass
class DerivedEclpParams:
    tauAlpha: Vector2
    tauBeta: Vector2
    u: int
    v: int
    w: int
    z: int
    dSq: int


class MaxBalancesExceededError(Exception):
    def __init__(self):
        super().__init__("Max assets exceeded")


class MaxInvariantExceededError(Exception):
    def __init__(self):
        super().__init__("Max invariant exceeded")


class GyroECLPMath:
    # Constants
    _ONEHALF = int("500000000000000000")  # 0.5e18
    _ONE = int("1000000000000000000")  # 1e18
    _ONE_XP = int("100000000000000000000000000000000000000")  # 1e38

    # Anti-overflow limits: Params and DerivedParams
    _ROTATION_VECTOR_NORM_ACCURACY = int("1000")  # 1e3 (1e-15 in normal precision)
    _MAX_STRETCH_FACTOR = int(
        "100000000000000000000000000"
    )  # 1e26 (1e8 in normal precision)
    _DERIVED_TAU_NORM_ACCURACY_XP = int("100000000000000000000000")  # 1e23
    _MAX_INV_INVARIANT_DENOMINATOR_XP = int(
        "10000000000000000000000000000000000000000000"
    )  # 1e43
    _DERIVED_DSQ_NORM_ACCURACY_XP = int("100000000000000000000000")  # 1e23

    # Anti-overflow limits: Dynamic values
    _MAX_BALANCES = int("100000000000000000000000000000000000")  # 1e34
    MAX_INVARIANT = int("3000000000000000000000000000000000000")  # 3e37

    # Invariant ratio limits
    MIN_INVARIANT_RATIO = int("600000000000000000")  # 60e16 (60%)
    MAX_INVARIANT_RATIO = int("5000000000000000000")  # 500e16 (500%)

    @staticmethod
    def scalar_prod(t1: Vector2, t2: Vector2) -> int:
        x_prod = SignedFixedPoint.mul_down_mag(t1.x, t2.x)
        y_prod = SignedFixedPoint.mul_down_mag(t1.y, t2.y)
        return x_prod + y_prod

    @staticmethod
    def scalar_prod_xp(t1: Vector2, t2: Vector2) -> int:
        return SignedFixedPoint.mul_xp(t1.x, t2.x) + SignedFixedPoint.mul_xp(t1.y, t2.y)

    @staticmethod
    def mul_a(params: EclpParams, tp: Vector2) -> Vector2:
        return Vector2(
            x=SignedFixedPoint.div_down_mag_u(
                SignedFixedPoint.mul_down_mag_u(params.c, tp.x)
                - SignedFixedPoint.mul_down_mag_u(params.s, tp.y),
                params.lambda_,
            ),
            y=(
                SignedFixedPoint.mul_down_mag_u(params.s, tp.x)
                + SignedFixedPoint.mul_down_mag_u(params.c, tp.y)
            ),
        )

    @classmethod
    def virtual_offset0(cls, p: EclpParams, d: DerivedEclpParams, r: Vector2) -> int:
        term_xp = SignedFixedPoint.div_xp_u(d.tauBeta.x, d.dSq)

        if d.tauBeta.x > 0:
            a = SignedFixedPoint.mul_up_xp_to_np_u(
                SignedFixedPoint.mul_up_mag_u(
                    SignedFixedPoint.mul_up_mag_u(r.x, p.lambda_), p.c
                ),
                term_xp,
            )
        else:
            a = SignedFixedPoint.mul_up_xp_to_np_u(
                SignedFixedPoint.mul_down_mag_u(
                    SignedFixedPoint.mul_down_mag_u(r.y, p.lambda_), p.c
                ),
                term_xp,
            )

        return a + SignedFixedPoint.mul_up_xp_to_np_u(
            SignedFixedPoint.mul_up_mag_u(r.x, p.s),
            SignedFixedPoint.div_xp_u(d.tauBeta.y, d.dSq),
        )

    @classmethod
    def virtual_offset1(cls, p: EclpParams, d: DerivedEclpParams, r: Vector2) -> int:
        term_xp = SignedFixedPoint.div_xp_u(d.tauAlpha.x, d.dSq)

        if d.tauAlpha.x < 0:
            b = SignedFixedPoint.mul_up_xp_to_np_u(
                SignedFixedPoint.mul_up_mag_u(
                    SignedFixedPoint.mul_up_mag_u(r.x, p.lambda_), p.s
                ),
                -term_xp,
            )
        else:
            b = SignedFixedPoint.mul_up_xp_to_np_u(
                SignedFixedPoint.mul_down_mag_u(
                    SignedFixedPoint.mul_down_mag_u(-r.y, p.lambda_), p.s
                ),
                term_xp,
            )

        return b + SignedFixedPoint.mul_up_xp_to_np_u(
            SignedFixedPoint.mul_up_mag_u(r.x, p.c),
            SignedFixedPoint.div_xp_u(d.tauAlpha.y, d.dSq),
        )

    @classmethod
    def max_balances0(cls, p: EclpParams, d: DerivedEclpParams, r: Vector2) -> int:
        term_xp1 = SignedFixedPoint.div_xp_u(d.tauBeta.x - d.tauAlpha.x, d.dSq)
        term_xp2 = SignedFixedPoint.div_xp_u(d.tauBeta.y - d.tauAlpha.y, d.dSq)

        xp = SignedFixedPoint.mul_down_xp_to_np_u(
            SignedFixedPoint.mul_down_mag_u(
                SignedFixedPoint.mul_down_mag_u(r.y, p.lambda_), p.c
            ),
            term_xp1,
        )

        term2 = (
            SignedFixedPoint.mul_down_mag_u(r.y, p.s)
            if term_xp2 > 0
            else SignedFixedPoint.mul_up_mag_u(r.x, p.s)
        )

        return xp + SignedFixedPoint.mul_down_xp_to_np_u(term2, term_xp2)

    @classmethod
    def max_balances1(cls, p: EclpParams, d: DerivedEclpParams, r: Vector2) -> int:
        term_xp1 = SignedFixedPoint.div_xp_u(d.tauBeta.x - d.tauAlpha.x, d.dSq)

        term_xp2 = SignedFixedPoint.div_xp_u(d.tauAlpha.y - d.tauBeta.y, d.dSq)

        yp = SignedFixedPoint.mul_down_xp_to_np_u(
            SignedFixedPoint.mul_down_mag_u(
                SignedFixedPoint.mul_down_mag_u(r.y, p.lambda_),
                p.s,
            ),
            term_xp1,
        )

        term2 = (
            SignedFixedPoint.mul_down_mag_u(r.y, p.c)
            if term_xp2 > 0
            else SignedFixedPoint.mul_up_mag_u(r.x, p.c)
        )

        return yp + SignedFixedPoint.mul_down_xp_to_np_u(term2, term_xp2)

    @classmethod
    def calc_at_a_chi(cls, x: int, y: int, p: EclpParams, d: DerivedEclpParams) -> int:
        dSq2 = SignedFixedPoint.mul_xp_u(d.dSq, d.dSq)

        term_xp = SignedFixedPoint.div_xp_u(
            SignedFixedPoint.div_down_mag_u(
                SignedFixedPoint.div_down_mag_u(d.w, p.lambda_) + d.z,
                p.lambda_,
            ),
            dSq2,
        )

        val = SignedFixedPoint.mul_down_xp_to_np_u(
            SignedFixedPoint.mul_down_mag_u(x, p.c)
            - SignedFixedPoint.mul_down_mag_u(y, p.s),
            term_xp,
        )

        ## (x lambda s + y lambda c) * u, note u > 0
        term_np = SignedFixedPoint.mul_down_mag_u(
            SignedFixedPoint.mul_down_mag_u(x, p.lambda_), p.s
        ) + SignedFixedPoint.mul_down_mag_u(
            SignedFixedPoint.mul_down_mag_u(y, p.lambda_), p.c
        )

        val = val + SignedFixedPoint.mul_down_xp_to_np_u(
            term_np, SignedFixedPoint.div_xp_u(d.u, dSq2)
        )

        # (sx+cy) * v, note v > 0
        term_np = SignedFixedPoint.mul_down_mag_u(
            x, p.s
        ) + SignedFixedPoint.mul_down_mag_u(y, p.c)
        val = val + SignedFixedPoint.mul_down_xp_to_np_u(
            term_np, SignedFixedPoint.div_xp_u(d.v, dSq2)
        )

        return val

    @classmethod
    def calc_a_chi_a_chi_in_xp(cls, p: EclpParams, d: DerivedEclpParams) -> int:
        dSq3 = SignedFixedPoint.mul_xp_u(
            SignedFixedPoint.mul_xp_u(d.dSq, d.dSq),
            d.dSq,
        )

        val = SignedFixedPoint.mul_up_mag_u(
            p.lambda_,
            SignedFixedPoint.div_xp_u(
                SignedFixedPoint.mul_xp_u(2 * d.u, d.v),
                dSq3,
            ),
        )

        val += SignedFixedPoint.mul_up_mag_u(
            SignedFixedPoint.mul_up_mag_u(
                SignedFixedPoint.div_xp_u(
                    SignedFixedPoint.mul_xp_u(d.u + 1, d.u + 1),
                    dSq3,
                ),
                p.lambda_,
            ),
            p.lambda_,
        )

        val += SignedFixedPoint.div_xp_u(SignedFixedPoint.mul_xp_u(d.v, d.v), dSq3)

        term_xp = SignedFixedPoint.div_up_mag_u(d.w, p.lambda_) + d.z
        val += SignedFixedPoint.div_xp_u(
            SignedFixedPoint.mul_xp_u(term_xp, term_xp),
            dSq3,
        )

        return val

    @classmethod
    def calculate_invariant_with_error(
        cls, balances: List[int], params: EclpParams, derived: DerivedEclpParams
    ) -> Tuple[int, int]:
        x, y = balances[0], balances[1]

        if x + y > cls._MAX_BALANCES:
            raise MaxBalancesExceededError()

        at_a_chi = cls.calc_at_a_chi(x, y, params, derived)

        invariant_result = cls.calc_invariant_sqrt(x, y, params, derived)
        sqrt = invariant_result[0]
        err = invariant_result[1]

        # Note: the minimum non-zero value of sqrt is 1e-9 since the minimum argument is 1e-18
        if sqrt > 0:
            # err + 1 to account for O(eps_np) term ignored before
            err = SignedFixedPoint.div_up_mag_u(err + 1, 2 * sqrt)
        else:
            # In the false case here, the extra precision error does not magnify, and so the error inside the sqrt is
            # O(1e-18)
            # somedayTODO: The true case will almost surely never happen (can it be removed)
            err = gyro_pool_math_sqrt(err, 5) if err > 0 else int(1e9)

        # Calculate the error in the numerator, scale the error by 20 to be sure all possible terms accounted for
        err = (
            SignedFixedPoint.mul_up_mag_u(params.lambda_, x + y) // cls._ONE_XP
            + err
            + 1
        ) * 20

        achiachi = cls.calc_a_chi_a_chi_in_xp(params, derived)
        # A chi \cdot A chi > 1, so round it up to round denominator up.
        # Denominator uses extra precision, so we do * 1/denominator so we are sure the calculation doesn't overflow.
        mul_denominator = SignedFixedPoint.div_xp_u(
            cls._ONE_XP,
            achiachi - cls._ONE_XP,
        )

        # As an alternative, could do, but could overflow:
        # invariant = (AtAChi.add(sqrt) - err).divXp(denominator)
        numerator = at_a_chi + sqrt - err

        invariant = SignedFixedPoint.mul_down_xp_to_np_u(
            numerator,
            mul_denominator,
        )

        # Error scales if denominator is small.
        # NB: This error calculation computes the error in the expression "numerator / denominator",
        # but in this code, we actually use the formula "numerator * (1 / denominator)" to compute the invariant.
        # This affects this line and the one below.
        err = SignedFixedPoint.mul_up_xp_to_np_u(err, mul_denominator)

        # Account for relative error due to error in the denominator.
        # Error in denominator is O(epsilon) if lambda<1e11, scale up by 10 to be sure we catch it, and add O(eps).
        # Error in denominator is lambda^2 * 2e-37 and scales relative to the result / denominator.
        # Scale by a constant to account for errors in the scaling factor itself and limited compounding.
        # Calculating lambda^2 without decimals so that the calculation will never overflow, the lost precision isn't important.
        err = (
            err
            + (
                SignedFixedPoint.mul_up_xp_to_np_u(invariant, mul_denominator)
                * ((params.lambda_ * params.lambda_) // int(1e36))
                * 40
            )
            // cls._ONE_XP
            + 1
        )

        if invariant + err > cls.MAX_INVARIANT:
            raise MaxInvariantExceededError()

        return invariant, err

    @classmethod
    def calc_invariant_sqrt(
        cls,
        x: int,
        y: int,
        p: EclpParams,
        d: DerivedEclpParams,
    ) -> tuple[int, int]:
        val1 = cls.calc_min_atx_a_chiy_sq_plus_atx_sq(x, y, p, d)
        val2 = cls.calc_2_atx_aty_a_chix_a_chiy(x, y, p, d)
        val3 = cls.calc_min_aty_a_chix_sq_plus_aty_sq(x, y, p, d)
        val = val1 + val2 + val3

        err = (
            SignedFixedPoint.mul_up_mag_u(x, x) + SignedFixedPoint.mul_up_mag_u(y, y)
        ) // int(1e38)

        val = gyro_pool_math_sqrt(val, 5) if val > 0 else 0

        return val, err

    @classmethod
    def calc_min_atx_a_chiy_sq_plus_atx_sq(
        cls,
        x: int,
        y: int,
        p: EclpParams,
        d: DerivedEclpParams,
    ) -> int:
        term1 = SignedFixedPoint.mul_up_mag_u(
            SignedFixedPoint.mul_up_mag_u(SignedFixedPoint.mul_up_mag_u(x, x), p.c),
            p.c,
        )
        term2 = SignedFixedPoint.mul_up_mag_u(
            SignedFixedPoint.mul_up_mag_u(SignedFixedPoint.mul_up_mag_u(y, y), p.s),
            p.s,
        )
        term_np = term1 + term2

        term3 = SignedFixedPoint.mul_down_mag_u(
            SignedFixedPoint.mul_down_mag_u(
                SignedFixedPoint.mul_down_mag_u(x, y), p.c * 2
            ),
            p.s,
        )
        term_np -= term3

        term_xp1 = SignedFixedPoint.mul_xp_u(d.u, d.u)
        term_xp2 = SignedFixedPoint.div_down_mag_u(
            SignedFixedPoint.mul_xp_u(d.u * 2, d.v), p.lambda_
        )
        term_xp3 = SignedFixedPoint.div_down_mag_u(
            SignedFixedPoint.div_down_mag_u(
                SignedFixedPoint.mul_xp_u(d.v, d.v), p.lambda_
            ),
            p.lambda_,
        )
        term_xp = term_xp1 + term_xp2 + term_xp3

        denominator = SignedFixedPoint.mul_xp_u(
            SignedFixedPoint.mul_xp_u(SignedFixedPoint.mul_xp_u(d.dSq, d.dSq), d.dSq),
            d.dSq,
        )
        term_xp = SignedFixedPoint.div_xp_u(term_xp, denominator)

        val = SignedFixedPoint.mul_down_xp_to_np_u(-term_np, term_xp)

        term4 = SignedFixedPoint.div_down_mag_u(
            SignedFixedPoint.div_down_mag_u(term_np - 9, p.lambda_), p.lambda_
        )
        term5 = SignedFixedPoint.div_xp_u(SignedFixedPoint.ONE_XP, d.dSq)
        val += SignedFixedPoint.mul_down_xp_to_np_u(term4, term5)

        return val

    @classmethod
    def calc_2_atx_aty_a_chix_a_chiy(
        cls,
        x: int,
        y: int,
        p: EclpParams,
        d: DerivedEclpParams,
    ) -> int:
        term_np = SignedFixedPoint.mul_down_mag_u(
            SignedFixedPoint.mul_down_mag_u(
                SignedFixedPoint.mul_down_mag_u(x, x)
                - SignedFixedPoint.mul_up_mag_u(y, y),
                2 * p.c,
            ),
            p.s,
        )

        xy = SignedFixedPoint.mul_down_mag_u(y, 2 * x)

        term_np += SignedFixedPoint.mul_down_mag_u(
            SignedFixedPoint.mul_down_mag_u(xy, p.c), p.c
        ) - SignedFixedPoint.mul_down_mag_u(
            SignedFixedPoint.mul_down_mag_u(xy, p.s), p.s
        )

        term_xp = SignedFixedPoint.mul_xp_u(d.z, d.u) + SignedFixedPoint.div_down_mag_u(
            SignedFixedPoint.div_down_mag_u(
                SignedFixedPoint.mul_xp_u(d.w, d.v), p.lambda_
            ),
            p.lambda_,
        )

        term_xp += SignedFixedPoint.div_down_mag_u(
            SignedFixedPoint.mul_xp_u(d.w, d.u) + SignedFixedPoint.mul_xp_u(d.z, d.v),
            p.lambda_,
        )

        term_xp = SignedFixedPoint.div_xp_u(
            term_xp,
            SignedFixedPoint.mul_xp_u(
                SignedFixedPoint.mul_xp_u(
                    SignedFixedPoint.mul_xp_u(d.dSq, d.dSq), d.dSq
                ),
                d.dSq,
            ),
        )

        return SignedFixedPoint.mul_down_xp_to_np_u(term_np, term_xp)

    @classmethod
    def calc_min_aty_a_chix_sq_plus_aty_sq(
        cls,
        x: int,
        y: int,
        p: EclpParams,
        d: DerivedEclpParams,
    ) -> int:
        term_np = SignedFixedPoint.mul_up_mag_u(
            SignedFixedPoint.mul_up_mag_u(SignedFixedPoint.mul_up_mag_u(x, x), p.s),
            p.s,
        ) + SignedFixedPoint.mul_up_mag_u(
            SignedFixedPoint.mul_up_mag_u(SignedFixedPoint.mul_up_mag_u(y, y), p.c),
            p.c,
        )

        term_np += SignedFixedPoint.mul_up_mag_u(
            SignedFixedPoint.mul_up_mag_u(SignedFixedPoint.mul_up_mag_u(x, y), p.s * 2),
            p.c,
        )

        term_xp = SignedFixedPoint.mul_xp_u(d.z, d.z) + SignedFixedPoint.div_down_mag_u(
            SignedFixedPoint.div_down_mag_u(
                SignedFixedPoint.mul_xp_u(d.w, d.w), p.lambda_
            ),
            p.lambda_,
        )

        term_xp += SignedFixedPoint.div_down_mag_u(
            SignedFixedPoint.mul_xp_u(2 * d.z, d.w), p.lambda_
        )

        term_xp = SignedFixedPoint.div_xp_u(
            term_xp,
            SignedFixedPoint.mul_xp_u(
                SignedFixedPoint.mul_xp_u(
                    SignedFixedPoint.mul_xp_u(d.dSq, d.dSq), d.dSq
                ),
                d.dSq,
            ),
        )

        val = SignedFixedPoint.mul_down_xp_to_np_u(-term_np, term_xp)

        val += SignedFixedPoint.mul_down_xp_to_np_u(
            term_np - 9,
            SignedFixedPoint.div_xp_u(SignedFixedPoint.ONE_XP, d.dSq),
        )

        return val

    @classmethod
    def calc_spot_price0in1(
        cls,
        balances: List[int],
        params: EclpParams,
        derived: DerivedEclpParams,
        invariant: int,
    ) -> int:
        r = Vector2(x=invariant, y=invariant)
        ab = Vector2(
            x=cls.virtual_offset0(params, derived, r),
            y=cls.virtual_offset1(params, derived, r),
        )
        vec = Vector2(x=balances[0] - ab.x, y=balances[1] - ab.y)

        transformed_vec = cls.mul_a(params, vec)
        pc = Vector2(
            x=SignedFixedPoint.div_down_mag_u(transformed_vec.x, transformed_vec.y),
            y=cls._ONE,
        )

        pgx = cls.scalar_prod(pc, cls.mul_a(params, Vector2(x=cls._ONE, y=0)))
        return SignedFixedPoint.div_down_mag(
            pgx, cls.scalar_prod(pc, cls.mul_a(params, Vector2(x=0, y=cls._ONE)))
        )

    @classmethod
    def check_asset_bounds(
        cls,
        params: EclpParams,
        derived: DerivedEclpParams,
        invariant: Vector2,
        new_bal: int,
        asset_index: int,
    ) -> None:
        if asset_index == 0:
            x_plus = cls.max_balances0(params, derived, invariant)
            if new_bal > cls._MAX_BALANCES or new_bal > x_plus:
                raise ValueError("Asset bounds exceeded")
        else:
            y_plus = cls.max_balances1(params, derived, invariant)
            if new_bal > cls._MAX_BALANCES or new_bal > y_plus:
                raise ValueError("Asset bounds exceeded")

    @classmethod
    def calc_out_given_in(
        cls,
        balances: List[int],
        amount_in: int,
        token_in_is_token0: bool,
        params: EclpParams,
        derived: DerivedEclpParams,
        invariant: Vector2,
    ) -> int:
        if token_in_is_token0:
            ix_in, ix_out = 0, 1
            calc_given = cls.calc_y_given_x  # type: ignore[assignment]
        else:
            ix_in, ix_out = 1, 0
            calc_given = cls.calc_x_given_y  # type: ignore[assignment]

        bal_in_new = balances[ix_in] + amount_in
        cls.check_asset_bounds(params, derived, invariant, bal_in_new, ix_in)
        bal_out_new = calc_given(bal_in_new, params, derived, invariant)
        return balances[ix_out] - bal_out_new

    @classmethod
    def calc_in_given_out(
        cls,
        balances: List[int],
        amount_out: int,
        token_in_is_token0: bool,
        params: EclpParams,
        derived: DerivedEclpParams,
        invariant: Vector2,
    ) -> int:
        if token_in_is_token0:
            ix_in, ix_out = 0, 1
            calc_given = cls.calc_x_given_y  # type: ignore[assignment]
            # Note: reversed compared to calc_out_given_in
        else:
            ix_in, ix_out = 1, 0
            calc_given = cls.calc_y_given_x  # type: ignore[assignment]
            # Note: reversed compared to calc_out_given_in

        if amount_out > balances[ix_out]:
            raise ValueError("Asset bounds exceeded")

        bal_out_new = balances[ix_out] - amount_out
        bal_in_new = calc_given(bal_out_new, params, derived, invariant)
        cls.check_asset_bounds(params, derived, invariant, bal_in_new, ix_in)
        return bal_in_new - balances[ix_in]

    @classmethod
    def solve_quadratic_swap(
        cls,
        lambda_: int,
        x: int,
        s: int,
        c: int,
        r: Vector2,
        ab: Vector2,
        tauBeta: Vector2,
        dSq: int,
    ) -> int:
        lam_bar = Vector2(
            x=SignedFixedPoint.ONE_XP
            - SignedFixedPoint.div_down_mag_u(
                SignedFixedPoint.div_down_mag_u(SignedFixedPoint.ONE_XP, lambda_),
                lambda_,
            ),
            y=SignedFixedPoint.ONE_XP
            - SignedFixedPoint.div_up_mag_u(
                SignedFixedPoint.div_up_mag_u(SignedFixedPoint.ONE_XP, lambda_), lambda_
            ),
        )

        q = {"a": 0, "b": 0, "c": 0}
        xp = x - ab.x

        if xp > 0:
            q["b"] = SignedFixedPoint.mul_up_xp_to_np_u(
                SignedFixedPoint.mul_down_mag_u(
                    SignedFixedPoint.mul_down_mag_u(-xp, s), c
                ),
                SignedFixedPoint.div_xp_u(lam_bar.y, dSq),
            )
        else:
            q["b"] = SignedFixedPoint.mul_up_xp_to_np_u(
                SignedFixedPoint.mul_up_mag_u(SignedFixedPoint.mul_up_mag_u(-xp, s), c),
                SignedFixedPoint.div_xp_u(lam_bar.x, dSq) + 1,
            )

        s_term = Vector2(
            x=SignedFixedPoint.div_xp_u(
                SignedFixedPoint.mul_down_mag_u(
                    SignedFixedPoint.mul_down_mag_u(lam_bar.y, s), s
                ),
                dSq,
            ),
            y=SignedFixedPoint.div_xp_u(
                SignedFixedPoint.mul_up_mag_u(
                    SignedFixedPoint.mul_up_mag_u(lam_bar.x, s), s
                ),
                dSq + 1,
            )
            + 1,
        )

        s_term.x = SignedFixedPoint.ONE_XP - s_term.x
        s_term.y = SignedFixedPoint.ONE_XP - s_term.y

        q["c"] = -cls.calc_xp_xp_div_lambda_lambda(x, r, lambda_, s, c, tauBeta, dSq)
        q["c"] = q["c"] + SignedFixedPoint.mul_down_xp_to_np_u(
            SignedFixedPoint.mul_down_mag_u(r.y, r.y), s_term.y
        )

        q["c"] = gyro_pool_math_sqrt(q["c"], 5) if q["c"] > 0 else 0

        if q["b"] - q["c"] > 0:
            q["a"] = SignedFixedPoint.mul_up_xp_to_np_u(
                q["b"] - q["c"],
                SignedFixedPoint.div_xp_u(SignedFixedPoint.ONE_XP, s_term.y) + 1,
            )
        else:
            q["a"] = SignedFixedPoint.mul_up_xp_to_np_u(
                q["b"] - q["c"],
                SignedFixedPoint.div_xp_u(SignedFixedPoint.ONE_XP, s_term.x),
            )

        return q["a"] + ab.y

    @classmethod
    def calc_xp_xp_div_lambda_lambda(
        cls,
        x: int,
        r: Vector2,
        lambda_: int,
        s: int,
        c: int,
        tauBeta: Vector2,
        dSq: int,
    ) -> int:
        sq_vars = Vector2(
            x=SignedFixedPoint.mul_xp_u(dSq, dSq),
            y=SignedFixedPoint.mul_up_mag_u(r.x, r.x),
        )

        q = {"a": 0, "b": 0, "c": 0}
        term_xp = SignedFixedPoint.div_xp_u(
            SignedFixedPoint.mul_xp_u(tauBeta.x, tauBeta.y), sq_vars.x
        )

        if term_xp > 0:
            q["a"] = SignedFixedPoint.mul_up_mag_u(sq_vars.y, 2 * s)
            q["a"] = SignedFixedPoint.mul_up_xp_to_np_u(
                SignedFixedPoint.mul_up_mag_u(q["a"], c), term_xp + 7
            )
        else:
            q["a"] = SignedFixedPoint.mul_down_mag_u(r.y, r.y)
            q["a"] = SignedFixedPoint.mul_down_mag_u(q["a"], 2 * s)
            q["a"] = SignedFixedPoint.mul_up_xp_to_np_u(
                SignedFixedPoint.mul_down_mag_u(q["a"], c), term_xp
            )

        if tauBeta.x < 0:
            q["b"] = SignedFixedPoint.mul_up_xp_to_np_u(
                SignedFixedPoint.mul_up_mag_u(
                    SignedFixedPoint.mul_up_mag_u(r.x, x), 2 * c
                ),
                -SignedFixedPoint.div_xp_u(tauBeta.x, dSq) + 3,
            )
        else:
            q["b"] = SignedFixedPoint.mul_up_xp_to_np_u(
                SignedFixedPoint.mul_down_mag_u(
                    SignedFixedPoint.mul_down_mag_u(-r.y, x), 2 * c
                ),
                SignedFixedPoint.div_xp_u(tauBeta.x, dSq),
            )
        q["a"] = q["a"] + q["b"]

        term_xp2 = (
            SignedFixedPoint.div_xp_u(
                SignedFixedPoint.mul_xp_u(tauBeta.y, tauBeta.y), sq_vars.x
            )
            + 7
        )

        q["b"] = SignedFixedPoint.mul_up_mag_u(sq_vars.y, s)
        q["b"] = SignedFixedPoint.mul_up_xp_to_np_u(
            SignedFixedPoint.mul_up_mag_u(q["b"], s), term_xp2
        )

        q["c"] = SignedFixedPoint.mul_up_xp_to_np_u(
            SignedFixedPoint.mul_down_mag_u(
                SignedFixedPoint.mul_down_mag_u(-r.y, x), 2 * s
            ),
            SignedFixedPoint.div_xp_u(tauBeta.y, dSq),
        )

        q["b"] = q["b"] + q["c"] + SignedFixedPoint.mul_up_mag_u(x, x)
        q["b"] = (
            SignedFixedPoint.div_up_mag_u(q["b"], lambda_)
            if q["b"] > 0
            else SignedFixedPoint.div_down_mag_u(q["b"], lambda_)
        )

        q["a"] = q["a"] + q["b"]
        q["a"] = (
            SignedFixedPoint.div_up_mag_u(q["a"], lambda_)
            if q["a"] > 0
            else SignedFixedPoint.div_down_mag_u(q["a"], lambda_)
        )

        term_xp2 = (
            SignedFixedPoint.div_xp_u(
                SignedFixedPoint.mul_xp_u(tauBeta.x, tauBeta.x), sq_vars.x
            )
            + 7
        )

        val = SignedFixedPoint.mul_up_mag_u(
            SignedFixedPoint.mul_up_mag_u(sq_vars.y, c), c
        )
        return SignedFixedPoint.mul_up_xp_to_np_u(val, term_xp2) + q["a"]

    @classmethod
    def calc_y_given_x(
        cls, x: int, params: EclpParams, d: DerivedEclpParams, r: Vector2
    ) -> int:
        ab = Vector2(
            x=cls.virtual_offset0(params, d, r), y=cls.virtual_offset1(params, d, r)
        )
        return cls.solve_quadratic_swap(
            params.lambda_, x, params.s, params.c, r, ab, d.tauBeta, d.dSq
        )

    @classmethod
    def calc_x_given_y(
        cls, y: int, params: EclpParams, d: DerivedEclpParams, r: Vector2
    ) -> int:
        ba = Vector2(
            x=cls.virtual_offset1(params, d, r), y=cls.virtual_offset0(params, d, r)
        )
        return cls.solve_quadratic_swap(
            params.lambda_,
            y,
            params.c,
            params.s,
            r,
            ba,
            Vector2(x=-d.tauAlpha.x, y=d.tauAlpha.y),
            d.dSq,
        )
