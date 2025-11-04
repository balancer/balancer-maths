use crate::common::errors::PoolError;
use crate::common::maths::mul_up_fixed;
use crate::pools::gyro::gyro_pool_math::gyro_pool_math_sqrt;
use crate::pools::gyro::signed_fixed_point::{
    div_down_mag, div_up_mag, div_xp_u, mul_down_mag, mul_down_xp_to_np, mul_up_mag,
    mul_up_xp_to_np, mul_xp_u, ONE_XP,
};
use alloy_primitives::{uint, I256, U256};
use std::str::FromStr;

// Constants matching Python implementation
pub const _ONEHALF: U256 = uint!(500000000000000000_U256); // 0.5e18
pub const _ONE: U256 = uint!(1000000000000000000_U256); // 1e18

// Anti-overflow limits: Params and DerivedParams
pub const _ROTATION_VECTOR_NORM_ACCURACY: U256 = uint!(1000_U256); // 1e3 (1e-15 in normal precision)
pub const _MAX_STRETCH_FACTOR: U256 = uint!(100000000000000000000000000_U256); // 1e26 (1e8 in normal precision)
pub const _DERIVED_TAU_NORM_ACCURACY_XP: U256 = uint!(100000000000000000000000_U256); // 1e23
pub const _MAX_INV_INVARIANT_DENOMINATOR_XP: U256 =
    uint!(10000000000000000000000000000000000000000000_U256); // 1e43
pub const _DERIVED_DSQ_NORM_ACCURACY_XP: U256 = uint!(100000000000000000000000_U256); // 1e23

// Anti-overflow limits: Dynamic values
pub const _MAX_BALANCES: I256 = I256::from_raw(uint!(10000000000000000000000000000000000_U256)); // 1e34
pub const _MAX_INVARIANT: I256 = I256::from_raw(uint!(3000000000000000000000000000000000000_U256)); // 3e37

// Invariant ratio limits
pub const MIN_INVARIANT_RATIO: U256 = uint!(600000000000000000_U256); // 60e16 (60%)
pub const MAX_INVARIANT_RATIO: U256 = uint!(5000000000000000000_U256); // 500e16 (500%)

#[derive(Debug, Clone)]
pub struct Vector2 {
    pub x: I256,
    pub y: I256,
}

#[derive(Debug, Clone)]
pub struct QParams {
    pub a: I256,
    pub b: I256,
    pub c: I256,
}

#[derive(Debug, Clone)]
pub struct EclpParams {
    pub alpha: I256,
    pub beta: I256,
    pub c: I256,
    pub s: I256,
    pub lambda: I256,
}

#[derive(Debug, Clone)]
pub struct DerivedEclpParams {
    pub tau_alpha: Vector2,
    pub tau_beta: Vector2,
    pub u: I256,
    pub v: I256,
    pub w: I256,
    pub z: I256,
    pub d_sq: I256,
}

// Custom errors
#[derive(Debug)]
pub struct MaxBalancesExceededError;

#[derive(Debug)]
pub struct MaxInvariantExceededError;

// Core Gyro ECLP math functions
fn scalar_prod(t1: &Vector2, t2: &Vector2) -> I256 {
    let x_prod = mul_down_mag(&t1.x, &t2.x);
    let y_prod = mul_down_mag(&t1.y, &t2.y);
    x_prod + y_prod
}

// commented out to avoid dead code warning
// fn scalar_prod_xp(t1: &Vector2, t2: &Vector2) -> U256 {
//     mul_xp(&t1.x, &t2.x) + mul_xp(&t1.y, &t2.y)
// }

fn mul_a(params: &EclpParams, tp: &Vector2) -> Vector2 {
    // Calculate the numerator for x component using signed arithmetic
    let numerator = mul_down_mag(&params.c, &tp.x) - mul_down_mag(&params.s, &tp.y);

    // Calculate x component
    let x_result = div_down_mag(&numerator, &params.lambda);

    // Calculate y component using signed arithmetic
    let y_result = mul_down_mag(&params.s, &tp.x) + mul_down_mag(&params.c, &tp.y);

    Vector2 {
        x: x_result,
        y: y_result,
    }
}

fn virtual_offset0(p: &EclpParams, d: &DerivedEclpParams, r: &Vector2) -> I256 {
    let term_xp = div_xp_u(&d.tau_beta.x, &d.d_sq);

    let a = if d.tau_beta.x > I256::ZERO {
        mul_up_xp_to_np(&mul_up_mag(&mul_up_mag(&r.x, &p.lambda), &p.c), &term_xp)
    } else {
        mul_up_xp_to_np(
            &mul_down_mag(&mul_down_mag(&r.y, &p.lambda), &p.c),
            &term_xp,
        )
    };

    a + mul_up_xp_to_np(&mul_up_mag(&r.x, &p.s), &div_xp_u(&d.tau_beta.y, &d.d_sq))
}

fn virtual_offset1(p: &EclpParams, d: &DerivedEclpParams, r: &Vector2) -> I256 {
    let term_xp = div_xp_u(&d.tau_alpha.x, &d.d_sq);

    let b = if d.tau_alpha.x < I256::ZERO {
        mul_up_xp_to_np(&mul_up_mag(&mul_up_mag(&r.x, &p.lambda), &p.s), &(-term_xp))
    } else {
        mul_up_xp_to_np(
            &mul_down_mag(&mul_down_mag(&(-r.y), &p.lambda), &p.s),
            &term_xp,
        )
    };

    b + mul_up_xp_to_np(&mul_up_mag(&r.x, &p.c), &div_xp_u(&d.tau_alpha.y, &d.d_sq))
}

fn max_balances0(p: &EclpParams, d: &DerivedEclpParams, r: &Vector2) -> I256 {
    let term_xp1 = div_xp_u(&(d.tau_beta.x - d.tau_alpha.x), &d.d_sq);
    let term_xp2 = div_xp_u(&(d.tau_beta.y - d.tau_alpha.y), &d.d_sq);

    let xp = mul_down_xp_to_np(
        &mul_down_mag(&mul_down_mag(&r.y, &p.lambda), &p.c),
        &term_xp1,
    );

    let term2 = if term_xp2 > I256::ZERO {
        mul_down_mag(&r.y, &p.s)
    } else {
        mul_up_mag(&r.x, &p.s)
    };

    xp + mul_down_xp_to_np(&term2, &term_xp2)
}

fn max_balances1(p: &EclpParams, d: &DerivedEclpParams, r: &Vector2) -> I256 {
    let term_xp1 = div_xp_u(&(d.tau_beta.x - d.tau_alpha.x), &d.d_sq);
    let term_xp2 = div_xp_u(&(d.tau_alpha.y - d.tau_beta.y), &d.d_sq);

    let yp = mul_down_xp_to_np(
        &mul_down_mag(&mul_down_mag(&r.y, &p.lambda), &p.s),
        &term_xp1,
    );

    let term2 = if term_xp2 > I256::ZERO {
        mul_down_mag(&r.y, &p.c)
    } else {
        mul_up_mag(&r.x, &p.c)
    };

    yp + mul_down_xp_to_np(&term2, &term_xp2)
}

fn calc_at_a_chi(x: &I256, y: &I256, p: &EclpParams, d: &DerivedEclpParams) -> I256 {
    let d_sq2 = mul_xp_u(&d.d_sq, &d.d_sq);

    let term_xp = div_xp_u(
        &div_down_mag(&(div_down_mag(&d.w, &p.lambda) + d.z), &p.lambda),
        &d_sq2,
    );

    let mut val = mul_down_xp_to_np(&(mul_down_mag(x, &p.c) - mul_down_mag(y, &p.s)), &term_xp);

    // (x lambda s + y lambda c) * u, note u > 0
    let term_np = mul_down_mag(&mul_down_mag(x, &p.lambda), &p.s)
        + mul_down_mag(&mul_down_mag(y, &p.lambda), &p.c);

    val += mul_down_xp_to_np(&term_np, &div_xp_u(&d.u, &d_sq2));

    // (sx+cy) * v, note v > 0
    let term_np = mul_down_mag(x, &p.s) + mul_down_mag(y, &p.c);
    val += mul_down_xp_to_np(&term_np, &div_xp_u(&d.v, &d_sq2));

    val
}

fn calc_a_chi_a_chi_in_xp(p: &EclpParams, d: &DerivedEclpParams) -> I256 {
    let d_sq3 = mul_xp_u(&mul_xp_u(&d.d_sq, &d.d_sq), &d.d_sq);

    let mut val = mul_up_mag(
        &p.lambda,
        &div_xp_u(
            &mul_xp_u(&(d.u * I256::from_str("2").unwrap()), &d.v),
            &d_sq3,
        ),
    );

    val += mul_up_mag(
        &mul_up_mag(
            &div_xp_u(&mul_xp_u(&(d.u + I256::ONE), &(d.u + I256::ONE)), &d_sq3),
            &p.lambda,
        ),
        &p.lambda,
    );

    val += div_xp_u(&mul_xp_u(&d.v, &d.v), &d_sq3);

    let term_xp = div_up_mag(&d.w, &p.lambda) + d.z;
    val += div_xp_u(&mul_xp_u(&term_xp, &term_xp), &d_sq3);

    val
}

fn calc_invariant_sqrt(x: &I256, y: &I256, p: &EclpParams, d: &DerivedEclpParams) -> (I256, I256) {
    let val1 = calc_min_atx_a_chiy_sq_plus_atx_sq(x, y, p, d);
    let val2 = calc_2_atx_aty_a_chix_a_chiy(x, y, p, d);
    let val3 = calc_min_aty_a_chix_sq_plus_aty_sq(x, y, p, d);
    let val = val1 + val2 + val3;

    let err = (mul_up_mag(x, x) + mul_up_mag(y, y)) / ONE_XP;

    let val = if val > I256::ZERO {
        // Convert to U256 for sqrt, then back to I256
        let val_u256 = val.into_raw();
        let sqrt_result = gyro_pool_math_sqrt(&val_u256, 5);
        I256::from_raw(sqrt_result)
    } else {
        I256::ZERO
    };

    (val, err)
}

fn calc_min_atx_a_chiy_sq_plus_atx_sq(
    x: &I256,
    y: &I256,
    p: &EclpParams,
    d: &DerivedEclpParams,
) -> I256 {
    let term1 = mul_up_mag(&mul_up_mag(&mul_up_mag(x, x), &p.c), &p.c);
    let term2 = mul_up_mag(&mul_up_mag(&mul_up_mag(y, y), &p.s), &p.s);
    let term_np = term1 + term2;

    let term3 = mul_down_mag(
        &mul_down_mag(&mul_down_mag(x, y), &(p.c * I256::from_str("2").unwrap())),
        &p.s,
    );
    let term_np = term_np - term3;

    let term_xp1 = mul_xp_u(&d.u, &d.u);
    let term_xp2 = div_down_mag(
        &mul_xp_u(&(d.u * I256::from_str("2").unwrap()), &d.v),
        &p.lambda,
    );
    let term_xp3 = div_down_mag(&div_down_mag(&mul_xp_u(&d.v, &d.v), &p.lambda), &p.lambda);
    let term_xp = term_xp1 + term_xp2 + term_xp3;

    let denominator = mul_xp_u(&mul_xp_u(&mul_xp_u(&d.d_sq, &d.d_sq), &d.d_sq), &d.d_sq);
    let term_xp = div_xp_u(&term_xp, &denominator);

    let mut val = mul_down_xp_to_np(&(-term_np), &term_xp);

    let term4 = div_down_mag(
        &div_down_mag(&(term_np - I256::from_str("9").unwrap()), &p.lambda),
        &p.lambda,
    );
    let term5 = div_xp_u(&ONE_XP, &d.d_sq);
    val += mul_down_xp_to_np(&term4, &term5);

    val
}

fn calc_2_atx_aty_a_chix_a_chiy(x: &I256, y: &I256, p: &EclpParams, d: &DerivedEclpParams) -> I256 {
    let term_np = mul_down_mag(
        &mul_down_mag(
            &(mul_down_mag(x, x) - mul_up_mag(y, y)),
            &(p.c * I256::from_str("2").unwrap()),
        ),
        &p.s,
    );

    let xy = mul_down_mag(y, &(*x * I256::from_str("2").unwrap()));

    let term_np = term_np + mul_down_mag(&mul_down_mag(&xy, &p.c), &p.c)
        - mul_down_mag(&mul_down_mag(&xy, &p.s), &p.s);

    let term_xp = mul_xp_u(&d.z, &d.u)
        + div_down_mag(&div_down_mag(&mul_xp_u(&d.w, &d.v), &p.lambda), &p.lambda);

    let term_xp = term_xp + div_down_mag(&(mul_xp_u(&d.w, &d.u) + mul_xp_u(&d.z, &d.v)), &p.lambda);

    let term_xp = div_xp_u(
        &term_xp,
        &mul_xp_u(&mul_xp_u(&mul_xp_u(&d.d_sq, &d.d_sq), &d.d_sq), &d.d_sq),
    );

    mul_down_xp_to_np(&term_np, &term_xp)
}

fn calc_min_aty_a_chix_sq_plus_aty_sq(
    x: &I256,
    y: &I256,
    p: &EclpParams,
    d: &DerivedEclpParams,
) -> I256 {
    let term_np = mul_up_mag(&mul_up_mag(&mul_up_mag(x, x), &p.s), &p.s)
        + mul_up_mag(&mul_up_mag(&mul_up_mag(y, y), &p.c), &p.c);

    let term_np = term_np
        + mul_up_mag(
            &mul_up_mag(&mul_up_mag(x, y), &(p.s * I256::from_str("2").unwrap())),
            &p.c,
        );

    let term_xp = mul_xp_u(&d.z, &d.z)
        + div_down_mag(&div_down_mag(&mul_xp_u(&d.w, &d.w), &p.lambda), &p.lambda);

    let term_xp = term_xp
        + div_down_mag(
            &mul_xp_u(&(d.z * I256::from_str("2").unwrap()), &d.w),
            &p.lambda,
        );

    let term_xp = div_xp_u(
        &term_xp,
        &mul_xp_u(&mul_xp_u(&mul_xp_u(&d.d_sq, &d.d_sq), &d.d_sq), &d.d_sq),
    );

    let mut val = mul_down_xp_to_np(&(-term_np), &term_xp);

    val += mul_down_xp_to_np(
        &(term_np - I256::from_str("9").unwrap()),
        &div_xp_u(&ONE_XP, &d.d_sq),
    );

    val
}

pub fn calc_spot_price0in1(
    balances: &[U256],
    params: &EclpParams,
    derived: &DerivedEclpParams,
    invariant: &U256,
) -> U256 {
    // Convert invariant (U256) to I256 for Vector2.x
    let invariant_signed = I256::from_raw(*invariant);
    let invariant_y_signed = I256::from_raw(*invariant);
    let r = Vector2 {
        x: invariant_signed,
        y: invariant_y_signed,
    };

    let ab = Vector2 {
        x: virtual_offset0(params, derived, &r),
        y: virtual_offset1(params, derived, &r),
    };

    // Convert balances to I256
    let balance0_signed = I256::from_raw(balances[0]);
    let balance1_signed = I256::from_raw(balances[1]);

    let vec = Vector2 {
        x: balance0_signed - ab.x,
        y: balance1_signed - ab.y,
    };

    let transformed_vec = mul_a(params, &vec);

    let zero_signed = I256::ZERO;

    let pc = Vector2 {
        x: div_down_mag(&transformed_vec.x, &transformed_vec.y),
        y: ONE_XP,
    };

    let pgx = scalar_prod(
        &pc,
        &mul_a(
            params,
            &Vector2 {
                x: ONE_XP,
                y: zero_signed,
            },
        ),
    );

    let denominator = scalar_prod(
        &pc,
        &mul_a(
            params,
            &Vector2 {
                x: zero_signed,
                y: ONE_XP,
            },
        ),
    );

    // Convert result back to U256
    let result_signed = div_down_mag(&pgx, &denominator);
    result_signed.into_raw()
}

pub fn calculate_invariant_with_error(
    balances: &[U256],
    params: &EclpParams,
    derived: &DerivedEclpParams,
) -> Result<(I256, I256), PoolError> {
    // Convert balances to I256
    let x = I256::from_raw(balances[0]);
    let y = I256::from_raw(balances[1]);

    if x + y > _MAX_BALANCES {
        return Err(PoolError::InvalidInput("Max assets exceeded".to_string()));
    }

    let at_a_chi = calc_at_a_chi(&x, &y, params, derived);
    let invariant_result = calc_invariant_sqrt(&x, &y, params, derived);
    let sqrt = invariant_result.0;
    let mut err = invariant_result.1;

    // Note: the minimum non-zero value of sqrt is 1e-9 since the minimum argument is 1e-18
    if sqrt > I256::ZERO {
        // err + 1 to account for O(eps_np) term ignored before
        err = div_up_mag(&(err + I256::ONE), &(sqrt * I256::from_str("2").unwrap()));
    } else {
        // In the false case here, the extra precision error does not magnify, and so the error inside the sqrt is
        // O(1e-18)
        err = if err > I256::ZERO {
            let err_u256 = err.into_raw();
            let sqrt_result = gyro_pool_math_sqrt(&err_u256, 5);
            I256::from_raw(sqrt_result)
        } else {
            I256::from_str("1000000000").unwrap()
        };
    }

    // Calculate the error in the numerator, scale the error by 20 to be sure all possible terms accounted for
    // err = &(&(mul_up_mag_u(&params.lambda, &(x + y)) / &*_ONE_XP) + &err + BigInt::from(1u64))
    //     * BigInt::from(20u64);
    err = ((mul_up_mag(&params.lambda, &(x + y))) / ONE_XP + err + I256::ONE) * I256::from_str("20").unwrap();
    // err = ((params.lambda * (x + y)) / ONE_XP + err + I256::ONE) * I256::from_str("20").unwrap();

    let achiachi = calc_a_chi_a_chi_in_xp(params, derived);
    // A chi \cdot A chi > 1, so round it up to round denominator up.
    // Denominator uses extra precision, so we do * 1/denominator so we are sure the calculation doesn't overflow.
    let mul_denominator = div_xp_u(&ONE_XP, &(achiachi - ONE_XP));

    // As an alternative, could do, but could overflow:
    // invariant = (AtAChi.add(sqrt) - err).divXp(denominator)
    let numerator = at_a_chi + sqrt - err;
    let invariant = mul_down_xp_to_np(&numerator, &mul_denominator);

    // Error scales if denominator is small.
    // NB: This error calculation computes the error in the expression "numerator / denominator",
    // but in this code, we actually use the formula "numerator * (1 / denominator)" to compute the invariant.
    // This affects this line and the one below.
    err = mul_up_xp_to_np(&err, &mul_denominator);

    // Account for relative error due to error in the denominator.
    // Error in denominator is O(epsilon) if lambda<1e11, scale up by 10 to be sure we catch it, and add O(eps).
    // Error in denominator is lambda^2 * 2e-37 and scales relative to the result / denominator.
    // Scale by a constant to account for errors in the scaling factor itself and limited compounding.
    // Calculating lambda^2 without decimals so that the calculation will never overflow, the lost precision isn't important.
    let lambda_squared_div_1e36 = (params.lambda * params.lambda)
        / I256::from_dec_str("1000000000000000000000000000000000000").unwrap();
    let numerator = mul_up_xp_to_np(&invariant, &mul_denominator)
        * lambda_squared_div_1e36
        * I256::from_str("40").unwrap();
    err = err + (numerator / ONE_XP) + I256::ONE;

    if invariant + err > _MAX_INVARIANT {
        return Err(PoolError::InvalidInput(
            "Max invariant exceeded".to_string(),
        ));
    }
    Ok((invariant, err))
}

#[allow(clippy::too_many_arguments)]
fn solve_quadratic_swap(
    lambda: &I256,
    x: &I256,
    s: &I256,
    c: &I256,
    r: &Vector2,
    ab: &Vector2,
    tau_beta: &Vector2,
    d_sq: &I256,
) -> I256 {
    let lam_bar_x_result = ONE_XP - div_down_mag(&div_down_mag(&ONE_XP, lambda), lambda);
    let lam_bar = Vector2 {
        x: lam_bar_x_result,
        y: ONE_XP - div_up_mag(&div_up_mag(&ONE_XP, lambda), lambda),
    };

    let mut q = QParams {
        a: I256::ZERO,
        b: I256::ZERO,
        c: I256::ZERO,
    };

    let xp = *x - ab.x;

    if xp > I256::ZERO {
        q.b = mul_up_xp_to_np(
            &mul_down_mag(&mul_down_mag(&(-xp), s), c),
            &div_xp_u(&lam_bar.y, d_sq),
        );
    } else {
        q.b = mul_up_xp_to_np(
            &mul_up_mag(&mul_up_mag(&(-xp), s), c),
            &(div_xp_u(&lam_bar.x, d_sq) + I256::ONE),
        );
    }

    let s_term_x_result = div_xp_u(&mul_down_mag(&mul_down_mag(&lam_bar.y, s), s), d_sq);
    let s_term = Vector2 {
        x: s_term_x_result,
        y: div_xp_u(
            &mul_up_mag(&mul_up_mag(&lam_bar.x, s), s),
            &(*d_sq + I256::ONE),
        ) + I256::ONE,
    };

    let s_term_x = ONE_XP - s_term.x;
    let s_term_y = ONE_XP - s_term.y;

    q.c = -calc_xp_xp_div_lambda_lambda(x, r, lambda, s, c, tau_beta, d_sq);
    q.c += mul_down_xp_to_np(&mul_down_mag(&r.y, &r.y), &s_term_y);

    q.c = if q.c > I256::ZERO {
        let q_c_u256 = q.c.into_raw();
        let sqrt_result = gyro_pool_math_sqrt(&q_c_u256, 5);
        I256::from_raw(sqrt_result)
    } else {
        I256::ZERO
    };

    if q.b - q.c > I256::ZERO {
        q.a = mul_up_xp_to_np(&(q.b - q.c), &(div_xp_u(&ONE_XP, &s_term_y) + I256::ONE));
    } else {
        q.a = mul_up_xp_to_np(&(q.b - q.c), &div_xp_u(&ONE_XP, &s_term_x));
    }

    q.a + ab.y
}

fn calc_xp_xp_div_lambda_lambda(
    x: &I256,
    r: &Vector2,
    lambda: &I256,
    s: &I256,
    c: &I256,
    tau_beta: &Vector2,
    d_sq: &I256,
) -> I256 {
    let sq_vars_x_result = mul_xp_u(d_sq, d_sq);
    let sq_vars = Vector2 {
        x: sq_vars_x_result,
        y: mul_up_mag(&r.x, &r.x),
    };

    let mut q = QParams {
        a: I256::ZERO,
        b: I256::ZERO,
        c: I256::ZERO,
    };

    let term_xp = div_xp_u(&mul_xp_u(&tau_beta.x, &tau_beta.y), &sq_vars.x);

    if term_xp > I256::ZERO {
        q.a = mul_up_mag(&sq_vars.y, &(*s * I256::from_str("2").unwrap()));
        q.a = mul_up_xp_to_np(
            &mul_up_mag(&q.a, c),
            &(term_xp + I256::from_str("7").unwrap()),
        );
    } else {
        q.a = mul_down_mag(&r.y, &r.y);
        q.a = mul_down_mag(&q.a, &(*s * I256::from_str("2").unwrap()));
        q.a = mul_up_xp_to_np(&mul_down_mag(&q.a, c), &term_xp);
    }

    if tau_beta.x < I256::ZERO {
        q.b = mul_up_xp_to_np(
            &mul_up_mag(&mul_up_mag(&r.x, x), &(*c * I256::from_str("2").unwrap())),
            &(-div_xp_u(&tau_beta.x, d_sq) + I256::from_str("3").unwrap()),
        );
    } else {
        q.b = mul_up_xp_to_np(
            &mul_down_mag(
                &mul_down_mag(&(-r.y), x),
                &(*c * I256::from_str("2").unwrap()),
            ),
            &div_xp_u(&tau_beta.x, d_sq),
        );
    }
    q.a += q.b;

    let term_xp2 =
        div_xp_u(&mul_xp_u(&tau_beta.y, &tau_beta.y), &sq_vars.x) + I256::from_str("7").unwrap();

    q.b = mul_up_mag(&sq_vars.y, s);
    q.b = mul_up_xp_to_np(&mul_up_mag(&q.b, s), &term_xp2);

    q.c = mul_up_xp_to_np(
        &mul_down_mag(
            &mul_down_mag(&(-r.y), x),
            &(*s * I256::from_str("2").unwrap()),
        ),
        &div_xp_u(&tau_beta.y, d_sq),
    );

    q.b = q.b + q.c + mul_up_mag(x, x);
    q.b = if q.b > I256::ZERO {
        div_up_mag(&q.b, lambda)
    } else {
        div_down_mag(&q.b, lambda)
    };

    q.a += q.b;
    q.a = if q.a > I256::ZERO {
        div_up_mag(&q.a, lambda)
    } else {
        div_down_mag(&q.a, lambda)
    };

    let term_xp2 =
        div_xp_u(&mul_xp_u(&tau_beta.x, &tau_beta.x), &sq_vars.x) + I256::from_str("7").unwrap();

    let val = mul_up_mag(&mul_up_mag(&sq_vars.y, c), c);
    mul_up_xp_to_np(&val, &term_xp2) + q.a
}

fn calc_y_given_x(x: &I256, params: &EclpParams, d: &DerivedEclpParams, r: &Vector2) -> I256 {
    let ab = Vector2 {
        x: virtual_offset0(params, d, r),
        y: virtual_offset1(params, d, r),
    };
    solve_quadratic_swap(
        &params.lambda,
        x,
        &params.s,
        &params.c,
        r,
        &ab,
        &d.tau_beta,
        &d.d_sq,
    )
}

fn calc_x_given_y(y: &I256, params: &EclpParams, d: &DerivedEclpParams, r: &Vector2) -> I256 {
    let ba = Vector2 {
        x: virtual_offset1(params, d, r),
        y: virtual_offset0(params, d, r),
    };
    solve_quadratic_swap(
        &params.lambda,
        y,
        &params.c,
        &params.s,
        r,
        &ba,
        &Vector2 {
            x: -d.tau_alpha.x,
            y: d.tau_alpha.y,
        },
        &d.d_sq,
    )
}

fn check_asset_bounds(
    params: &EclpParams,
    derived: &DerivedEclpParams,
    invariant: &Vector2,
    new_bal: &I256,
    asset_index: usize,
) -> Result<(), PoolError> {
    if asset_index == 0 {
        let x_plus = max_balances0(params, derived, invariant);
        if new_bal > &_MAX_BALANCES || new_bal > &x_plus {
            return Err(PoolError::InvalidInput("Asset bounds exceeded".to_string()));
        }
    } else {
        let y_plus = max_balances1(params, derived, invariant);
        if new_bal > &_MAX_BALANCES || new_bal > &y_plus {
            return Err(PoolError::InvalidInput("Asset bounds exceeded".to_string()));
        }
    }
    Ok(())
}

pub fn calc_out_given_in(
    balances: &[U256],
    amount_in: &U256,
    token_in_is_token0: bool,
    params: &EclpParams,
    derived: &DerivedEclpParams,
    invariant: &Vector2,
) -> Result<U256, PoolError> {
    let bal_in_new = if token_in_is_token0 {
        let bal_in_new_signed = I256::from_raw(balances[0] + amount_in);
        check_asset_bounds(params, derived, invariant, &bal_in_new_signed, 0)?;
        let bal_out_new = calc_y_given_x(&bal_in_new_signed, params, derived, invariant);
        let bal_out_new_u256 = bal_out_new.into_raw();
        balances[1] - bal_out_new_u256
    } else {
        let bal_in_new_signed = I256::from_raw(balances[1] + amount_in);
        check_asset_bounds(params, derived, invariant, &bal_in_new_signed, 1)?;
        let bal_out_new = calc_x_given_y(&bal_in_new_signed, params, derived, invariant);
        let bal_out_new_u256 = bal_out_new.into_raw();
        balances[0] - bal_out_new_u256
    };
    Ok(bal_in_new)
}

pub fn calc_in_given_out(
    balances: &[U256],
    amount_out: &U256,
    token_in_is_token0: bool,
    params: &EclpParams,
    derived: &DerivedEclpParams,
    invariant: &Vector2,
) -> Result<U256, PoolError> {
    if token_in_is_token0 {
        if amount_out > &balances[1] {
            return Err(PoolError::InvalidInput("Asset bounds exceeded".to_string()));
        }
        let bal_out_new_signed = I256::from_raw(balances[1] - amount_out);
        let bal_in_new = calc_x_given_y(&bal_out_new_signed, params, derived, invariant);
        check_asset_bounds(params, derived, invariant, &bal_in_new, 0)?;
        let bal_in_new_u256 = bal_in_new.into_raw();
        Ok(bal_in_new_u256 - balances[0])
    } else {
        if amount_out > &balances[0] {
            return Err(PoolError::InvalidInput("Asset bounds exceeded".to_string()));
        }
        let bal_out_new_signed = I256::from_raw(balances[0] - amount_out);
        let bal_in_new = calc_y_given_x(&bal_out_new_signed, params, derived, invariant);
        check_asset_bounds(params, derived, invariant, &bal_in_new, 1)?;
        let bal_in_new_u256 = bal_in_new.into_raw();
        Ok(bal_in_new_u256 - balances[1])
    }
}

pub fn compute_balance(
    balances: &[U256],
    token_index: usize,
    invariant_ratio: &U256,
    params: &EclpParams,
    derived: &DerivedEclpParams,
) -> Result<U256, PoolError> {
    if balances.len() != 2 {
        return Err(PoolError::InvalidInput(
            "Gyro ECLP pools must have exactly 2 tokens".to_string(),
        ));
    }

    if token_index >= 2 {
        return Err(PoolError::InvalidInput("Invalid token index".to_string()));
    }

    // Calculate current invariant with error
    let (current_invariant, inv_err) = calculate_invariant_with_error(balances, params, derived)?;

    // The invariant vector contains the rounded up and rounded down invariant. Both are needed when computing
    // the virtual offsets. Depending on tauAlpha and tauBeta values, we want to use the invariant rounded up
    // or rounded down to make sure we're conservative in the output.
    let invariant_x_result =
        mul_up_fixed(&(current_invariant + inv_err).into_raw(), invariant_ratio)?;
    let invariant_y_result =
        mul_up_fixed(&(current_invariant - inv_err).into_raw(), invariant_ratio)?;

    let invariant = Vector2 {
        x: I256::from_raw(invariant_x_result),
        y: I256::from_raw(invariant_y_result),
    };

    // Edge case check. Should never happen except for insane tokens. If this is hit, actually adding the
    // tokens would lead to a revert or (if it went through) a deadlock downstream, so we catch it here.
    if invariant.x > _MAX_INVARIANT {
        return Err(PoolError::InvalidInput(
            "GyroECLPMath.MaxInvariantExceeded".to_string(),
        ));
    }

    if token_index == 0 {
        let balance1_signed = I256::from_raw(balances[1]);
        let result = calc_x_given_y(&balance1_signed, params, derived, &invariant);
        Ok(result.into_raw())
    } else {
        let balance0_signed = I256::from_raw(balances[0]);
        let result = calc_y_given_x(&balance0_signed, params, derived, &invariant);
        Ok(result.into_raw())
    }
}
