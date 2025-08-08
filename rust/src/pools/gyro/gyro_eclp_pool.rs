use crate::common::errors::PoolError;
use crate::common::pool_base::PoolBase;
use crate::common::types::{Rounding, SwapKind, SwapParams};
use crate::pools::gyro::gyro_eclp_data::GyroECLPImmutable;
use crate::pools::gyro::gyro_eclp_math::{
    calc_in_given_out, calc_out_given_in, calculate_invariant_with_error, compute_balance,
    DerivedEclpParams, EclpParams, Vector2,
};
use num_bigint::BigInt;

/// Gyro ECLP pool implementation
pub struct GyroECLPPool {
    pub params: EclpParams,
    pub derived: DerivedEclpParams,
}

impl GyroECLPPool {
    /// Create a new Gyro ECLP pool
    pub fn new(immutable: GyroECLPImmutable) -> Self {
        let params = EclpParams {
            alpha: immutable.alpha.clone(),
            beta: immutable.beta.clone(),
            c: immutable.c.clone(),
            s: immutable.s.clone(),
            lambda: immutable.lambda.clone(),
        };

        let derived = DerivedEclpParams {
            tau_alpha: Vector2 {
                x: immutable.tau_alpha_x.clone(),
                y: immutable.tau_alpha_y.clone(),
            },
            tau_beta: Vector2 {
                x: immutable.tau_beta_x.clone(),
                y: immutable.tau_beta_y.clone(),
            },
            u: immutable.u.clone(),
            v: immutable.v.clone(),
            w: immutable.w.clone(),
            z: immutable.z.clone(),
            d_sq: immutable.d_sq.clone(),
        };

        Self { params, derived }
    }
}

impl PoolBase for GyroECLPPool {
    fn get_maximum_invariant_ratio(&self) -> BigInt {
        use crate::pools::gyro::gyro_eclp_math::MAX_INVARIANT_RATIO;
        MAX_INVARIANT_RATIO.clone()
    }

    fn get_minimum_invariant_ratio(&self) -> BigInt {
        use crate::pools::gyro::gyro_eclp_math::MIN_INVARIANT_RATIO;
        MIN_INVARIANT_RATIO.clone()
    }

    fn on_swap(&self, swap_params: &SwapParams) -> Result<BigInt, PoolError> {
        // Calculate current invariant with error for swaps (matching Python pattern)
        let (current_invariant, inv_err) = calculate_invariant_with_error(
            &swap_params.balances_live_scaled_18,
            &self.params,
            &self.derived,
        )?;

        let invariant = Vector2 {
            x: &current_invariant + &(&inv_err * BigInt::from(2u64)),
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
        balances_live_scaled18: &[BigInt],
        rounding: Rounding,
    ) -> Result<BigInt, PoolError> {
        let (current_invariant, inv_err) =
            calculate_invariant_with_error(balances_live_scaled18, &self.params, &self.derived)?;
        match rounding {
            Rounding::RoundDown => Ok(&current_invariant - &inv_err),
            Rounding::RoundUp => Ok(&current_invariant + &inv_err),
        }
    }

    fn compute_balance(
        &self,
        balances_live_scaled18: &[BigInt],
        token_in_index: usize,
        invariant_ratio: &BigInt,
    ) -> Result<BigInt, PoolError> {
        compute_balance(
            balances_live_scaled18,
            token_in_index,
            invariant_ratio,
            &self.params,
            &self.derived,
        )
    }
}
