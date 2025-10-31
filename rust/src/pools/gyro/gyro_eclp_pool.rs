use crate::common::errors::PoolError;
use crate::common::pool_base::PoolBase;
use crate::common::types::{Rounding, SwapKind, SwapParams};
use crate::pools::gyro::gyro_eclp_data::GyroECLPImmutable;
use crate::pools::gyro::gyro_eclp_math::{
    calc_in_given_out, calc_out_given_in, calculate_invariant_with_error, compute_balance,
    DerivedEclpParams, EclpParams, Vector2,
};
use alloy_primitives::{I256, U256};

/// Gyro ECLP pool implementation
pub struct GyroECLPPool {
    pub params: EclpParams,
    pub derived: DerivedEclpParams,
}

impl GyroECLPPool {
    /// Create a new Gyro ECLP pool
    pub fn new(immutable: GyroECLPImmutable) -> Self {
        let params = EclpParams {
            alpha: immutable.alpha,
            beta: immutable.beta,
            c: immutable.c,
            s: immutable.s,
            lambda: immutable.lambda,
        };

        let derived = DerivedEclpParams {
            tau_alpha: Vector2 {
                x: immutable.tau_alpha_x,
                y: immutable.tau_alpha_y,
            },
            tau_beta: Vector2 {
                x: immutable.tau_beta_x,
                y: immutable.tau_beta_y,
            },
            u: immutable.u,
            v: immutable.v,
            w: immutable.w,
            z: immutable.z,
            d_sq: immutable.d_sq,
        };

        Self { params, derived }
    }
}

impl PoolBase for GyroECLPPool {
    fn get_maximum_invariant_ratio(&self) -> U256 {
        use crate::pools::gyro::gyro_eclp_math::MAX_INVARIANT_RATIO;
        MAX_INVARIANT_RATIO
    }

    fn get_minimum_invariant_ratio(&self) -> U256 {
        use crate::pools::gyro::gyro_eclp_math::MIN_INVARIANT_RATIO;
        MIN_INVARIANT_RATIO
    }

    fn on_swap(&self, swap_params: &SwapParams) -> Result<U256, PoolError> {
        // Calculate current invariant with error for swaps (matching Python pattern)
        let (current_invariant, inv_err) = calculate_invariant_with_error(
            &swap_params.balances_live_scaled_18,
            &self.params,
            &self.derived,
        )?;

        let invariant_x_result = current_invariant + inv_err * I256::try_from(2).unwrap();
        let invariant = Vector2 {
            x: invariant_x_result,
            y: current_invariant,
        };

        let token_in_is_token0 = swap_params.token_in_index == 0;

        match swap_params.swap_kind {
            SwapKind::GivenIn => calc_out_given_in(
                &swap_params.balances_live_scaled_18,
                &swap_params.amount_scaled_18,
                token_in_is_token0,
                &self.params,
                &self.derived,
                &invariant,
            ),
            SwapKind::GivenOut => calc_in_given_out(
                &swap_params.balances_live_scaled_18,
                &swap_params.amount_scaled_18,
                token_in_is_token0,
                &self.params,
                &self.derived,
                &invariant,
            ),
        }
    }

    fn compute_invariant(
        &self,
        balances_live_scaled18: &[U256],
        rounding: Rounding,
    ) -> Result<U256, PoolError> {
        let (current_invariant, inv_err) =
            calculate_invariant_with_error(balances_live_scaled18, &self.params, &self.derived)?;
        match rounding {
            Rounding::RoundDown => Ok((current_invariant - inv_err).into_raw()),
            Rounding::RoundUp => Ok((current_invariant + inv_err).into_raw()),
        }
    }

    fn compute_balance(
        &self,
        balances_live_scaled18: &[U256],
        token_in_index: usize,
        invariant_ratio: &U256,
    ) -> Result<U256, PoolError> {
        compute_balance(
            balances_live_scaled18,
            token_in_index,
            invariant_ratio,
            &self.params,
            &self.derived,
        )
    }
}
