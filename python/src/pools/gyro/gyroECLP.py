from dataclasses import dataclass
from src.maths import (
    Rounding,
    mul_up_fixed,
)
from src.swap import SwapKind
from src.pools.gyro.gyroECLP_math import (
    EclpParams,
    DerivedEclpParams,
    Vector2,
    GyroECLPMath,
)


@dataclass
class PoolParams:
    eclp_params: EclpParams
    derived_eclp_params: DerivedEclpParams


class GyroECLP:
    def __init__(self, pool_state):
        self.pool_params = PoolParams(
            eclp_params=EclpParams(
                alpha=pool_state.params_alpha,
                beta=pool_state.params_beta,
                c=pool_state.params_c,
                s=pool_state.params_s,
                lambda_=pool_state.params_lambda,
            ),
            derived_eclp_params=DerivedEclpParams(
                tauAlpha=Vector2(x=pool_state.tau_alpha_x, y=pool_state.tau_alpha_y),
                tauBeta=Vector2(x=pool_state.tau_beta_x, y=pool_state.tau_beta_y),
                u=pool_state.u,
                v=pool_state.v,
                w=pool_state.w,
                z=pool_state.z,
                dSq=pool_state.d_sq,
            ),
        )

    def get_maximum_invariant_ratio(self) -> int:
        return GyroECLPMath.MAX_INVARIANT_RATIO

    def get_minimum_invariant_ratio(self) -> int:
        return GyroECLPMath.MIN_INVARIANT_RATIO

    def on_swap(self, swap_params):
        token_in_is_token_0 = swap_params["index_in"] == 0

        eclp_params = self.pool_params.eclp_params
        derived_eclp_params = self.pool_params.derived_eclp_params

        # Tuple unpacking for the returned values from calculateInvariantWithError
        current_invariant, inv_err = GyroECLPMath.calculate_invariant_with_error(
            swap_params["balances_live_scaled18"], eclp_params, derived_eclp_params
        )

        invariant = Vector2(x=current_invariant + 2 * inv_err, y=current_invariant)

        if swap_params["swap_kind"] == SwapKind.GIVENIN.value:
            return GyroECLPMath.calc_out_given_in(
                swap_params["balances_live_scaled18"],
                swap_params["amount_given_scaled18"],
                token_in_is_token_0,
                eclp_params,
                derived_eclp_params,
                invariant,
            )

        return GyroECLPMath.calc_out_given_in(
            swap_params["balances_live_scaled18"],
            swap_params["amount_given_scaled18"],
            token_in_is_token_0,
            eclp_params,
            derived_eclp_params,
            invariant,
        )

    def compute_invariant(self, balances_live_scaled18, rounding):
        eclp_params = self.pool_params.eclp_params
        derived_eclp_params = self.pool_params.derived_eclp_params

        current_invariant, inv_err = GyroECLPMath.calculate_invariant_with_error(
            balances_live_scaled18, eclp_params, derived_eclp_params
        )

        if rounding == Rounding.ROUND_DOWN:
            return current_invariant - inv_err
        return current_invariant + inv_err

    def compute_balance(
        self,
        balances_live_scaled18,
        token_in_index,
        invariant_ratio,
    ):
        eclp_params = self.pool_params.eclp_params
        derived_eclp_params = self.pool_params.derived_eclp_params

        current_invariant, inv_err = GyroECLPMath.calculate_invariant_with_error(
            balances_live_scaled18, eclp_params, derived_eclp_params
        )

        # // The invariant vector contains the rounded up and rounded down invariant. Both are needed when computing
        # // the virtual offsets. Depending on tauAlpha and tauBeta values, we want to use the invariant rounded up
        # // or rounded down to make sure we're conservative in the output.
        invariant = Vector2(
            x=mul_up_fixed(current_invariant + inv_err, invariant_ratio),
            y=mul_up_fixed(current_invariant - inv_err, invariant_ratio),
        )

        # // Edge case check. Should never happen except for insane tokens. If this is hit, actually adding the
        # // tokens would lead to a revert or (if it went through) a deadlock downstream, so we catch it here.
        if invariant.x > GyroECLPMath.MAX_INVARIANT:
            raise ValueError("GyroECLPMath.MaxInvariantExceeded")

        if token_in_index == 0:
            return GyroECLPMath.calc_x_given_y(
                balances_live_scaled18[1], eclp_params, derived_eclp_params, invariant
            )

        return GyroECLPMath.calc_y_given_x(
            balances_live_scaled18[0], eclp_params, derived_eclp_params, invariant
        )
