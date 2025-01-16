from dataclasses import dataclass
from typing import List, Tuple
from src.pools.gyro.signed_fixed_point import SignedFixedPoint
from src.pools.gyro.gyro_pool_math import sqrt


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
        term_xp1 = SignedFixedPoint.div_xp_u(d.tau_beta.x - d.tau_alpha.x, d.d_sq)

        term_xp2 = SignedFixedPoint.div_xp_u(d.tau_alpha.y - d.tau_beta.y, d.d_sq)

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
        d_sq2 = SignedFixedPoint.mul_xp_u(d.dSq, d.dSq)

        term_xp = SignedFixedPoint.div_xp_u(
            SignedFixedPoint.div_down_mag_u(
                SignedFixedPoint.div_down_mag_u(d.w, p.lambda_) + d.z,
                p.lambda_,
            ),
            d_sq2,
        )

        val = SignedFixedPoint.mul_down_xp_to_np_u(
            SignedFixedPoint.mul_down_mag_u(x, p.c)
            - SignedFixedPoint.mul_down_mag_u(y, p.s),
            term_xp,
        )

        term_np1 = SignedFixedPoint.mul_down_mag_u(x, p.lambda_)
        term_np2 = SignedFixedPoint.mul_down_mag_u(y, p.lambda_)

        val += SignedFixedPoint.mul_down_xp_to_np_u(
            SignedFixedPoint.mul_down_mag_u(term_np1, p.s)
            + SignedFixedPoint.mul_down_mag_u(term_np2, p.c),
            SignedFixedPoint.div_xp_u(d.u, d_sq2),
        )

        val += SignedFixedPoint.mul_down_xp_to_np_u(
            SignedFixedPoint.mul_down_mag_u(x, p.s)
            + SignedFixedPoint.mul_down_mag_u(y, p.c),
            SignedFixedPoint.div_xp_u(d.v, d_sq2),
        )
        return val

    @classmethod
    def calc_a_chi_a_chi_in_xp(cls, p: EclpParams, d: DerivedEclpParams) -> int:
        d_sq3 = SignedFixedPoint.mul_xp_u(
            SignedFixedPoint.mul_xp_u(d.dSq, d.dSq),
            d.dSq,
        )

        val = SignedFixedPoint.mul_up_mag_u(
            p.lambda_,
            SignedFixedPoint.div_xp_u(
                SignedFixedPoint.mul_xp_u(2 * d.u, d.v),
                d_sq3,
            ),
        )

        val += SignedFixedPoint.mul_up_mag_u(
            SignedFixedPoint.mul_up_mag_u(
                SignedFixedPoint.div_xp_u(
                    SignedFixedPoint.mul_xp_u(d.u + 1, d.u + 1),
                    d_sq3,
                ),
                p.lambda_,
            ),
            p.lambda_,
        )

        val += SignedFixedPoint.div_xp_u(SignedFixedPoint.mul_xp_u(d.v, d.v), d_sq3)

        term_xp = SignedFixedPoint.div_up_mag_u(d.w, p.lambda_) + d.z
        val += SignedFixedPoint.div_xp_u(
            SignedFixedPoint.mul_xp_u(term_xp, term_xp),
            d_sq3,
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
        achiachi = cls.calc_a_chi_a_chi_in_xp(params, derived)

        # Calculate error (simplified)
        err = (
            SignedFixedPoint.mul_up_mag_u(params.lambda_, x + y) // cls._ONE_XP + 1
        ) * 20

        mul_denominator = SignedFixedPoint.div_xp_u(cls._ONE_XP, achiachi - cls._ONE_XP)

        invariant = SignedFixedPoint.mul_down_xp_to_np_u(
            at_a_chi - err, mul_denominator
        )

        # Error calculation (simplified)
        scaled_err = SignedFixedPoint.mul_up_xp_to_np_u(err, mul_denominator)
        total_err = (
            scaled_err
            + (
                invariant
                * (
                    (params.lambda_ * params.lambda_)
                    // int("10000000000000000000000000000000000000")
                )
                * 40
            )
            // cls._ONE_XP
            + 1
        )

        if invariant + total_err > cls.MAX_INVARIANT:
            raise MaxInvariantExceededError()

        return invariant, total_err

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
            ix_in, ix_out, calc_given = 0, 1, cls.calc_y_given_x
        else:
            ix_in, ix_out, calc_given = 1, 0, cls.calc_x_given_y

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
            ix_in, ix_out, calc_given = (
                0,
                1,
                cls.calc_x_given_y,
            )  # Note: reversed compared to calc_out_given_in
        else:
            ix_in, ix_out, calc_given = (
                1,
                0,
                cls.calc_y_given_x,
            )  # Note: reversed compared to calc_out_given_in

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
        tau_beta: Vector2,
        d_sq: int,
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
                SignedFixedPoint.div_xp_u(lam_bar.y, d_sq),
            )
        else:
            q["b"] = SignedFixedPoint.mul_up_xp_to_np_u(
                SignedFixedPoint.mul_up_mag_u(SignedFixedPoint.mul_up_mag_u(-xp, s), c),
                SignedFixedPoint.div_xp_u(lam_bar.x, d_sq) + 1,
            )

        s_term = Vector2(
            x=SignedFixedPoint.div_xp_u(
                SignedFixedPoint.mul_down_mag_u(
                    SignedFixedPoint.mul_down_mag_u(lam_bar.y, s), s
                ),
                d_sq,
            ),
            y=SignedFixedPoint.div_xp_u(
                SignedFixedPoint.mul_up_mag_u(
                    SignedFixedPoint.mul_up_mag_u(lam_bar.x, s), s
                ),
                d_sq + 1,
            )
            + 1,
        )

        s_term.x = SignedFixedPoint.ONE_XP - s_term.x
        s_term.y = SignedFixedPoint.ONE_XP - s_term.y

        q["c"] = -cls.calc_xp_xp_div_lambda_lambda(x, r, lambda_, s, c, tau_beta, d_sq)
        q["c"] = q["c"] + SignedFixedPoint.mul_down_xp_to_np_u(
            SignedFixedPoint.mul_down_mag_u(r.y, r.y), s_term.y
        )

        q["c"] = sqrt(q["c"], 5) if q["c"] > 0 else 0

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
        tau_beta: Vector2,
        d_sq: int,
    ) -> int:
        sq_vars = Vector2(
            x=SignedFixedPoint.mul_xp_u(d_sq, d_sq),
            y=SignedFixedPoint.mul_up_mag_u(r.x, r.x),
        )

        q = {"a": 0, "b": 0, "c": 0}
        term_xp = SignedFixedPoint.div_xp_u(
            SignedFixedPoint.mul_xp_u(tau_beta.x, tau_beta.y), sq_vars.x
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

        if tau_beta.x < 0:
            q["b"] = SignedFixedPoint.mul_up_xp_to_np_u(
                SignedFixedPoint.mul_up_mag_u(
                    SignedFixedPoint.mul_up_mag_u(r.x, x), 2 * c
                ),
                -SignedFixedPoint.div_xp_u(tau_beta.x, d_sq) + 3,
            )
        else:
            q["b"] = SignedFixedPoint.mul_up_xp_to_np_u(
                SignedFixedPoint.mul_down_mag_u(
                    SignedFixedPoint.mul_down_mag_u(-r.y, x), 2 * c
                ),
                SignedFixedPoint.div_xp_u(tau_beta.x, d_sq),
            )
        q["a"] = q["a"] + q["b"]

        term_xp2 = (
            SignedFixedPoint.div_xp_u(
                SignedFixedPoint.mul_xp_u(tau_beta.y, tau_beta.y), sq_vars.x
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
            SignedFixedPoint.div_xp_u(tau_beta.y, d_sq),
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
            params.lambda_, x, params.s, params.c, r, ab, d.tau_beta, d.d_sq
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
            Vector2(x=-d.tau_alpha.x, y=d.tau_alpha.y),
            d.d_sq,
        )
