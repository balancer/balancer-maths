use crate::common::constants::WAD;
use crate::common::errors::PoolError;
use crate::common::maths::{
    complement_fixed, div_down_fixed, div_up_fixed, mul_down_fixed, mul_up_fixed, pow_down_fixed,
    pow_up_fixed,
};
use lazy_static::lazy_static;
use num_bigint::BigInt;

lazy_static! {
    // A minimum normalized weight imposes a maximum weight ratio. We need this due to limitations in the
    // implementation of the power function, as these ratios are often exponents.
    pub static ref MIN_WEIGHT: BigInt = BigInt::from(10000000000000000u64); // 0.01e18

    // Pool limits that arise from limitations in the fixed point power function (and the imposed 1:100 maximum weight
    // ratio).

    // Swap limits: amounts swapped may not be larger than this percentage of the total balance.
    pub static ref MAX_IN_RATIO: BigInt = BigInt::from(300000000000000000u64); // 0.3e18
    pub static ref MAX_OUT_RATIO: BigInt = BigInt::from(300000000000000000u64); // 0.3e18

    // Invariant growth limit: non-proportional joins cannot cause the invariant to increase by more than this ratio.
    pub static ref MAX_INVARIANT_RATIO: BigInt = BigInt::from(3000000000000000000u64); // 3e18
    // Invariant shrink limit: non-proportional exits cannot cause the invariant to decrease by less than this ratio.
    pub static ref MIN_INVARIANT_RATIO: BigInt = BigInt::from(700000000000000000u64); // 0.7e18
}

/// Compute the invariant, rounding down.
///
/// The invariant functions are called by the Vault during various liquidity operations, and require a specific
/// rounding direction in order to ensure safety (i.e., that the final result is always rounded in favor of the
/// protocol. The invariant (i.e., all token balances) must always be greater than 0, or it will revert.
///
/// invariant               _____
/// wi = weight index i      | |      wi
/// bi = balance index i     | |  bi ^   = i
/// i = invariant
pub fn compute_invariant_down(
    normalized_weights: &[BigInt],
    balances: &[BigInt],
) -> Result<BigInt, PoolError> {
    let mut invariant = WAD.clone();

    for i in 0..normalized_weights.len() {
        let pow_result = pow_down_fixed(&balances[i], &normalized_weights[i])?;
        invariant = mul_down_fixed(&invariant, &pow_result)?;
    }

    if invariant == BigInt::from(0) {
        return Err(PoolError::ZeroInvariant);
    }

    Ok(invariant)
}

/// Compute the invariant, rounding up.
///
/// The invariant functions are called by the Vault during various liquidity operations, and require a specific
/// rounding direction in order to ensure safety (i.e., that the final result is always rounded in favor of the
/// protocol. The invariant (i.e., all token balances) must always be greater than 0, or it will revert.
///
/// invariant               _____
/// wi = weight index i      | |      wi
/// bi = balance index i     | |  bi ^   = i
/// i = invariant
pub fn compute_invariant_up(
    normalized_weights: &[BigInt],
    balances: &[BigInt],
) -> Result<BigInt, PoolError> {
    let mut invariant = WAD.clone();

    for i in 0..normalized_weights.len() {
        invariant = mul_up_fixed(
            &invariant,
            &pow_up_fixed(&balances[i], &normalized_weights[i])?,
        )?;
    }

    if invariant == BigInt::from(0) {
        return Err(PoolError::ZeroInvariant);
    }

    Ok(invariant)
}

/// Computes how many tokens can be taken out of a pool if `amount_in` are sent, given the
/// current balances and weights.
///
/// outGivenExactIn
/// aO = amountOut
/// bO = balanceOut
/// bI = balanceIn              /      /            bI             \    (wI / wO) \
/// aI = amountIn    aO = bO * |  1 - | --------------------------  | ^            |
/// wI = weightIn               \      \       ( bI + aI )         /              /
/// wO = weightOut
pub fn compute_out_given_exact_in(
    balance_in: &BigInt,
    weight_in: &BigInt,
    balance_out: &BigInt,
    weight_out: &BigInt,
    amount_in: &BigInt,
) -> Result<BigInt, PoolError> {
    if amount_in > &mul_down_fixed(balance_in, &*MAX_IN_RATIO)? {
        return Err(PoolError::MaxInRatioExceeded);
    }

    let denominator = balance_in + amount_in;
    let base = div_up_fixed(balance_in, &denominator)?;
    let exponent = div_down_fixed(weight_in, weight_out)?;
    let power = pow_up_fixed(&base, &exponent)?;

    // Because of rounding up, power can be greater than one. Using complement prevents reverts.
    Ok(mul_down_fixed(balance_out, &complement_fixed(&power)?)?)
}

/// Computes how many tokens must be sent to a pool in order to take `amount_out`, given the
/// current balances and weights.
///
/// inGivenExactOut
/// aO = amountOut
/// bO = balanceOut
/// bI = balanceIn              /  /            bO             \    (wO / wI)      \
/// aI = amountIn    aI = bI * |  | --------------------------  | ^            - 1  |
/// wI = weightIn               \  \       ( bO - aO )         /                   /
/// wO = weightOut
pub fn compute_in_given_exact_out(
    balance_in: &BigInt,
    weight_in: &BigInt,
    balance_out: &BigInt,
    weight_out: &BigInt,
    amount_out: &BigInt,
) -> Result<BigInt, PoolError> {
    if amount_out > &mul_down_fixed(balance_out, &*MAX_OUT_RATIO)? {
        return Err(PoolError::MaxOutRatioExceeded);
    }

    let base = div_up_fixed(balance_out, &(balance_out - amount_out))?;
    let exponent = div_up_fixed(weight_out, weight_in)?;
    let power = pow_up_fixed(&base, &exponent)?;

    // Because the base is larger than one (and the power rounds up), the power should always be larger than one, so
    // the following subtraction should never revert.
    let ratio = power - &*WAD;

    Ok(mul_up_fixed(balance_in, &ratio)?)
}

/// Calculate balance out given invariant
///
/// calculateBalanceGivenInvariant
/// o = balanceOut
/// b = balanceIn                      (1 / w)
/// w = weight              o = b * i ^
/// i = invariantRatio
pub fn compute_balance_out_given_invariant(
    current_balance: &BigInt,
    weight: &BigInt,
    invariant_ratio: &BigInt,
) -> Result<BigInt, PoolError> {
    // Rounds result up overall.
    // Calculate by how much the token balance has to increase to match the invariantRatio.
    let balance_ratio = pow_up_fixed(invariant_ratio, &div_up_fixed(&WAD, weight)?)?;

    Ok(mul_up_fixed(current_balance, &balance_ratio)?)
}
