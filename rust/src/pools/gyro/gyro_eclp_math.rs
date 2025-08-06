use crate::common::errors::PoolError;
use crate::pools::gyro::signed_fixed_point::{
    mul_up_fixed, mul_down_mag, mul_down_mag_u, mul_up_mag_u, div_down_mag,
    div_down_mag_u, div_up_mag_u, mul_xp, mul_xp_u, div_xp_u, mul_down_xp_to_np_u, mul_up_xp_to_np_u
};
use crate::pools::gyro::gyro_pool_math::gyro_pool_math_sqrt;
use lazy_static::lazy_static;
use num_bigint::BigInt;
use num_traits::Zero;
use std::str::FromStr;

lazy_static! {
    // Constants matching Python implementation
    static ref _ONEHALF: BigInt = BigInt::from(500000000000000000u64); // 0.5e18
    static ref _ONE: BigInt = BigInt::from(1000000000000000000u64); // 1e18
    static ref _ONE_XP: BigInt = BigInt::from_str("100000000000000000000000000000000000000").unwrap(); // 1e38

    // Anti-overflow limits: Params and DerivedParams
    static ref _ROTATION_VECTOR_NORM_ACCURACY: BigInt = BigInt::from(1000u64); // 1e3 (1e-15 in normal precision)
    static ref _MAX_STRETCH_FACTOR: BigInt = BigInt::from_str("100000000000000000000000000").unwrap(); // 1e26 (1e8 in normal precision)
    static ref _DERIVED_TAU_NORM_ACCURACY_XP: BigInt = BigInt::from_str("100000000000000000000000").unwrap(); // 1e23
    static ref _MAX_INV_INVARIANT_DENOMINATOR_XP: BigInt = BigInt::from_str("10000000000000000000000000000000000000000000").unwrap(); // 1e43
    static ref _DERIVED_DSQ_NORM_ACCURACY_XP: BigInt = BigInt::from_str("100000000000000000000000").unwrap(); // 1e23

    // Anti-overflow limits: Dynamic values
    static ref _MAX_BALANCES: BigInt = BigInt::from_str("100000000000000000000000000000000000").unwrap(); // 1e34
    static ref MAX_INVARIANT: BigInt = BigInt::from_str("3000000000000000000000000000000000000").unwrap(); // 3e37

    // Invariant ratio limits
    pub static ref MIN_INVARIANT_RATIO: BigInt = BigInt::from(600000000000000000u64); // 60e16 (60%)
    pub static ref MAX_INVARIANT_RATIO: BigInt = BigInt::from(5000000000000000000u64); // 500e16 (500%)
}



#[derive(Debug, Clone)]
pub struct Vector2 {
    pub x: BigInt,
    pub y: BigInt,
}

#[derive(Debug, Clone)]
pub struct QParams {
    pub a: BigInt,
    pub b: BigInt,
    pub c: BigInt,
}

#[derive(Debug, Clone)]
pub struct EclpParams {
    pub alpha: BigInt,
    pub beta: BigInt,
    pub c: BigInt,
    pub s: BigInt,
    pub lambda: BigInt,
}

#[derive(Debug, Clone)]
pub struct DerivedEclpParams {
    pub tau_alpha: Vector2,
    pub tau_beta: Vector2,
    pub u: BigInt,
    pub v: BigInt,
    pub w: BigInt,
    pub z: BigInt,
    pub d_sq: BigInt,
}

// Custom errors
#[derive(Debug)]
pub struct MaxBalancesExceededError;

#[derive(Debug)]
pub struct MaxInvariantExceededError;



// Core Gyro ECLP math functions
fn scalar_prod(t1: &Vector2, t2: &Vector2) -> BigInt {
    let x_prod = mul_down_mag(&t1.x, &t2.x);
    let y_prod = mul_down_mag(&t1.y, &t2.y);
    x_prod + y_prod
}

fn scalar_prod_xp(t1: &Vector2, t2: &Vector2) -> BigInt {
    mul_xp(&t1.x, &t2.x) + mul_xp(&t1.y, &t2.y)
}

fn mul_a(params: &EclpParams, tp: &Vector2) -> Vector2 {
    Vector2 {
        x: div_down_mag_u(
            &(mul_down_mag_u(&params.c, &tp.x) - mul_down_mag_u(&params.s, &tp.y)),
            &params.lambda,
        ),
        y: mul_down_mag_u(&params.s, &tp.x) + mul_down_mag_u(&params.c, &tp.y),
    }
}

fn virtual_offset0(p: &EclpParams, d: &DerivedEclpParams, r: &Vector2) -> BigInt {
    let term_xp = div_xp_u(&d.tau_beta.x, &d.d_sq);
    
    let a = if d.tau_beta.x > BigInt::zero() {
        mul_up_xp_to_np_u(
            &mul_up_mag_u(&mul_up_mag_u(&r.x, &p.lambda), &p.c),
            &term_xp,
        )
    } else {
        mul_up_xp_to_np_u(
            &mul_down_mag_u(&mul_down_mag_u(&r.y, &p.lambda), &p.c),
            &term_xp,
        )
    };
    
    a + mul_up_xp_to_np_u(
        &mul_up_mag_u(&r.x, &p.s),
        &div_xp_u(&d.tau_beta.y, &d.d_sq),
    )
}

fn virtual_offset1(p: &EclpParams, d: &DerivedEclpParams, r: &Vector2) -> BigInt {
    let term_xp = div_xp_u(&d.tau_alpha.x, &d.d_sq);
    
    let b = if d.tau_alpha.x < BigInt::zero() {
        mul_up_xp_to_np_u(
            &mul_up_mag_u(&mul_up_mag_u(&r.x, &p.lambda), &p.s),
            &(-&term_xp),
        )
    } else {
        mul_up_xp_to_np_u(
            &mul_down_mag_u(&mul_down_mag_u(&(-&r.y), &p.lambda), &p.s),
            &term_xp,
        )
    };
    
    b + mul_up_xp_to_np_u(
        &mul_up_mag_u(&r.x, &p.c),
        &div_xp_u(&d.tau_alpha.y, &d.d_sq),
    )
}

fn max_balances0(p: &EclpParams, d: &DerivedEclpParams, r: &Vector2) -> BigInt {
    let term_xp1 = div_xp_u(&(&d.tau_beta.x - &d.tau_alpha.x), &d.d_sq);
    let term_xp2 = div_xp_u(&(&d.tau_beta.y - &d.tau_alpha.y), &d.d_sq);
    
    let xp = mul_down_xp_to_np_u(
        &mul_down_mag_u(&mul_down_mag_u(&r.y, &p.lambda), &p.c),
        &term_xp1,
    );
    
    let term2 = if term_xp2 > BigInt::zero() {
        mul_down_mag_u(&r.y, &p.s)
    } else {
        mul_up_mag_u(&r.x, &p.s)
    };
    
    xp + mul_down_xp_to_np_u(&term2, &term_xp2)
}

fn max_balances1(p: &EclpParams, d: &DerivedEclpParams, r: &Vector2) -> BigInt {
    let term_xp1 = div_xp_u(&(&d.tau_beta.x - &d.tau_alpha.x), &d.d_sq);
    let term_xp2 = div_xp_u(&(&d.tau_alpha.y - &d.tau_beta.y), &d.d_sq);
    
    let yp = mul_down_xp_to_np_u(
        &mul_down_mag_u(&mul_down_mag_u(&r.y, &p.lambda), &p.s),
        &term_xp1,
    );
    
    let term2 = if term_xp2 > BigInt::zero() {
        mul_down_mag_u(&r.y, &p.c)
    } else {
        mul_up_mag_u(&r.x, &p.c)
    };
    
    yp + mul_down_xp_to_np_u(&term2, &term_xp2)
}

fn calc_at_a_chi(x: &BigInt, y: &BigInt, p: &EclpParams, d: &DerivedEclpParams) -> BigInt {
    let d_sq2 = mul_xp_u(&d.d_sq, &d.d_sq);
    
    let term_xp = div_xp_u(
        &div_down_mag_u(
            &(div_down_mag_u(&d.w, &p.lambda) + &d.z),
            &p.lambda,
        ),
        &d_sq2,
    );
    
    let mut val = mul_down_xp_to_np_u(
        &(mul_down_mag_u(x, &p.c) - mul_down_mag_u(y, &p.s)),
        &term_xp,
    );
    
    // (x lambda s + y lambda c) * u, note u > 0
    let term_np = mul_down_mag_u(&mul_down_mag_u(x, &p.lambda), &p.s)
        + mul_down_mag_u(&mul_down_mag_u(y, &p.lambda), &p.c);
    
    val = val + mul_down_xp_to_np_u(&term_np, &div_xp_u(&d.u, &d_sq2));
    
    // (sx+cy) * v, note v > 0
    let term_np = mul_down_mag_u(x, &p.s) + mul_down_mag_u(y, &p.c);
    val = val + mul_down_xp_to_np_u(&term_np, &div_xp_u(&d.v, &d_sq2));
    
    val
}

fn calc_a_chi_a_chi_in_xp(p: &EclpParams, d: &DerivedEclpParams) -> BigInt {
    let d_sq3 = mul_xp_u(&mul_xp_u(&d.d_sq, &d.d_sq), &d.d_sq);
    
    let mut val = mul_up_mag_u(
        &p.lambda,
        &div_xp_u(
            &mul_xp_u(&(&d.u * BigInt::from(2u64)), &d.v),
            &d_sq3,
        ),
    );
    
    val = val + mul_up_mag_u(
        &mul_up_mag_u(
            &div_xp_u(
                &mul_xp_u(&(&d.u + BigInt::from(1u64)), &(&d.u + BigInt::from(1u64))),
                &d_sq3,
            ),
            &p.lambda,
        ),
        &p.lambda,
    );
    
    val = val + div_xp_u(&mul_xp_u(&d.v, &d.v), &d_sq3);
    
    let term_xp = div_up_mag_u(&d.w, &p.lambda) + &d.z;
    val = val + div_xp_u(&mul_xp_u(&term_xp, &term_xp), &d_sq3);
    
    val
}

fn calc_invariant_sqrt(
    x: &BigInt,
    y: &BigInt,
    p: &EclpParams,
    d: &DerivedEclpParams,
) -> (BigInt, BigInt) {
    let val1 = calc_min_atx_a_chiy_sq_plus_atx_sq(x, y, p, d);
    let val2 = calc_2_atx_aty_a_chix_a_chiy(x, y, p, d);
    let val3 = calc_min_aty_a_chix_sq_plus_aty_sq(x, y, p, d);
    let val = &val1 + &val2 + &val3;
    
    let err = (mul_up_mag_u(x, x) + mul_up_mag_u(y, y)) / &*_ONE_XP;
    
    let val = if val > BigInt::zero() {
        gyro_pool_math_sqrt(&val, 5)
    } else {
        BigInt::zero()
    };
    
    (val, err)
}

fn calc_min_atx_a_chiy_sq_plus_atx_sq(
    x: &BigInt,
    y: &BigInt,
    p: &EclpParams,
    d: &DerivedEclpParams,
) -> BigInt {
    let term1 = mul_up_mag_u(&mul_up_mag_u(&mul_up_mag_u(x, x), &p.c), &p.c);
    let term2 = mul_up_mag_u(&mul_up_mag_u(&mul_up_mag_u(y, y), &p.s), &p.s);
    let term_np = &term1 + &term2;
    
    let term3 = mul_down_mag_u(
        &mul_down_mag_u(&mul_down_mag_u(x, y), &(&p.c * BigInt::from(2u64))),
        &p.s,
    );
    let term_np = term_np - &term3;
    
    let term_xp1 = mul_xp_u(&d.u, &d.u);
    let term_xp2 = div_down_mag_u(&mul_xp_u(&(&d.u * BigInt::from(2u64)), &d.v), &p.lambda);
    let term_xp3 = div_down_mag_u(
        &div_down_mag_u(&mul_xp_u(&d.v, &d.v), &p.lambda),
        &p.lambda,
    );
    let term_xp = &term_xp1 + &term_xp2 + &term_xp3;
    
    let denominator = mul_xp_u(&mul_xp_u(&mul_xp_u(&d.d_sq, &d.d_sq), &d.d_sq), &d.d_sq);
    let term_xp = div_xp_u(&term_xp, &denominator);
    
    let mut val = mul_down_xp_to_np_u(&(-&term_np), &term_xp);
    
    let term4 = div_down_mag_u(
        &div_down_mag_u(&(&term_np - BigInt::from(9u64)), &p.lambda),
        &p.lambda,
    );
    let term5 = div_xp_u(&*_ONE_XP, &d.d_sq);
    val = val + mul_down_xp_to_np_u(&term4, &term5);
    
    val
}

fn calc_2_atx_aty_a_chix_a_chiy(
    x: &BigInt,
    y: &BigInt,
    p: &EclpParams,
    d: &DerivedEclpParams,
) -> BigInt {
    let term_np = mul_down_mag_u(
        &mul_down_mag_u(
            &(mul_down_mag_u(x, x) - mul_up_mag_u(y, y)),
            &(&p.c * BigInt::from(2u64)),
        ),
        &p.s,
    );
    
    let xy = mul_down_mag_u(y, &(x * BigInt::from(2u64)));
    
    let term_np = term_np + mul_down_mag_u(&mul_down_mag_u(&xy, &p.c), &p.c)
        - mul_down_mag_u(&mul_down_mag_u(&xy, &p.s), &p.s);
    
    let term_xp = mul_xp_u(&d.z, &d.u)
        + div_down_mag_u(
            &div_down_mag_u(&mul_xp_u(&d.w, &d.v), &p.lambda),
            &p.lambda,
        );
    
    let term_xp = term_xp + div_down_mag_u(
        &(mul_xp_u(&d.w, &d.u) + mul_xp_u(&d.z, &d.v)),
        &p.lambda,
    );
    
    let term_xp = div_xp_u(
        &term_xp,
        &mul_xp_u(&mul_xp_u(&mul_xp_u(&d.d_sq, &d.d_sq), &d.d_sq), &d.d_sq),
    );
    
    mul_down_xp_to_np_u(&term_np, &term_xp)
}

fn calc_min_aty_a_chix_sq_plus_aty_sq(
    x: &BigInt,
    y: &BigInt,
    p: &EclpParams,
    d: &DerivedEclpParams,
) -> BigInt {
    let term_np = mul_up_mag_u(&mul_up_mag_u(&mul_up_mag_u(x, x), &p.s), &p.s)
        + mul_up_mag_u(&mul_up_mag_u(&mul_up_mag_u(y, y), &p.c), &p.c);
    
    let term_np = term_np + mul_up_mag_u(
        &mul_up_mag_u(&mul_up_mag_u(x, y), &(&p.s * BigInt::from(2u64))),
        &p.c,
    );
    
    let term_xp = mul_xp_u(&d.z, &d.z)
        + div_down_mag_u(
            &div_down_mag_u(&mul_xp_u(&d.w, &d.w), &p.lambda),
            &p.lambda,
        );
    
    let term_xp = term_xp + div_down_mag_u(&mul_xp_u(&(&d.z * BigInt::from(2u64)), &d.w), &p.lambda);
    
    let term_xp = div_xp_u(
        &term_xp,
        &mul_xp_u(&mul_xp_u(&mul_xp_u(&d.d_sq, &d.d_sq), &d.d_sq), &d.d_sq),
    );
    
    let mut val = mul_down_xp_to_np_u(&(-&term_np), &term_xp);
    
    val = val + mul_down_xp_to_np_u(
        &(&term_np - BigInt::from(9u64)),
        &div_xp_u(&*_ONE_XP, &d.d_sq),
    );
    
    val
}

pub fn calc_spot_price0in1(
    balances: &[BigInt],
    params: &EclpParams,
    derived: &DerivedEclpParams,
    invariant: &BigInt,
) -> BigInt {
    let r = Vector2 {
        x: invariant.clone(),
        y: invariant.clone(),
    };
    let ab = Vector2 {
        x: virtual_offset0(params, derived, &r),
        y: virtual_offset1(params, derived, &r),
    };
    let vec = Vector2 {
        x: &balances[0] - &ab.x,
        y: &balances[1] - &ab.y,
    };

    let transformed_vec = mul_a(params, &vec);
    let pc = Vector2 {
        x: div_down_mag_u(&transformed_vec.x, &transformed_vec.y),
        y: _ONE.clone(),
    };

    let pgx = scalar_prod(&pc, &mul_a(params, &Vector2 { x: _ONE.clone(), y: BigInt::zero() }));
    div_down_mag(
        &pgx,
        &scalar_prod(&pc, &mul_a(params, &Vector2 { x: BigInt::zero(), y: _ONE.clone() }))
    )
} 

pub fn calculate_invariant_with_error(
    balances: &[BigInt],
    params: &EclpParams,
    derived: &DerivedEclpParams,
) -> Result<(BigInt, BigInt), PoolError> {
    let x = &balances[0];
    let y = &balances[1];
    
    if x + y > *_MAX_BALANCES {
        return Err(PoolError::InvalidInput("Max assets exceeded".to_string()));
    }
    
    let at_a_chi = calc_at_a_chi(x, y, params, derived);
    let invariant_result = calc_invariant_sqrt(x, y, params, derived);
    let sqrt = invariant_result.0;
    let mut err = invariant_result.1;
    
    // Note: the minimum non-zero value of sqrt is 1e-9 since the minimum argument is 1e-18
    if sqrt > BigInt::zero() {
        // err + 1 to account for O(eps_np) term ignored before
        err = div_up_mag_u(&(&err + BigInt::from(1u64)), &(&sqrt * BigInt::from(2u64)));
    } else {
        // In the false case here, the extra precision error does not magnify, and so the error inside the sqrt is
        // O(1e-18)
        err = if err > BigInt::zero() {
            gyro_pool_math_sqrt(&err, 5)
        } else {
            BigInt::from(1000000000u64)
        };
    }
    
    // Calculate the error in the numerator, scale the error by 20 to be sure all possible terms accounted for
    err = &(&(&params.lambda * (x + y)) / &*_ONE_XP + &err + BigInt::from(1u64)) * BigInt::from(20u64);
    
    let achiachi = calc_a_chi_a_chi_in_xp(params, derived);
    // A chi \cdot A chi > 1, so round it up to round denominator up.
    // Denominator uses extra precision, so we do * 1/denominator so we are sure the calculation doesn't overflow.
    let mul_denominator = div_xp_u(
        &*_ONE_XP,
        &(&achiachi - &*_ONE_XP),
    );
    
    // As an alternative, could do, but could overflow:
    // invariant = (AtAChi.add(sqrt) - err).divXp(denominator)
    let numerator = &at_a_chi + &sqrt - &err;
    let invariant = mul_down_xp_to_np_u(&numerator, &mul_denominator);
    

    
    // Error scales if denominator is small.
    // NB: This error calculation computes the error in the expression "numerator / denominator",
    // but in this code, we actually use the formula "numerator * (1 / denominator)" to compute the invariant.
    // This affects this line and the one below.
    err = mul_up_xp_to_np_u(&err, &mul_denominator);
    
    // Account for relative error due to error in the denominator.
    // Error in denominator is O(epsilon) if lambda<1e11, scale up by 10 to be sure we catch it, and add O(eps).
    // Error in denominator is lambda^2 * 2e-37 and scales relative to the result / denominator.
    // Scale by a constant to account for errors in the scaling factor itself and limited compounding.
    // Calculating lambda^2 without decimals so that the calculation will never overflow, the lost precision isn't important.
    let lambda_squared_div_1e36 = &(&params.lambda * &params.lambda) / BigInt::from_str("1000000000000000000000000000000000000").unwrap();
    let numerator = &mul_up_xp_to_np_u(&invariant, &mul_denominator) * &lambda_squared_div_1e36 * BigInt::from(40u64);
    err = err + &(&numerator / &*_ONE_XP) + BigInt::from(1u64);
    

    
    if &invariant + &err > *MAX_INVARIANT {
        return Err(PoolError::InvalidInput("Max invariant exceeded".to_string()));
    }
    
    Ok((invariant, err))
}

fn solve_quadratic_swap(
    lambda: &BigInt,
    x: &BigInt,
    s: &BigInt,
    c: &BigInt,
    r: &Vector2,
    ab: &Vector2,
    tau_beta: &Vector2,
    d_sq: &BigInt,
) -> BigInt {
    let lam_bar = Vector2 {
        x: &*_ONE_XP
            - div_down_mag_u(
                &div_down_mag_u(&*_ONE_XP, lambda),
                lambda,
            ),
        y: &*_ONE_XP
            - div_up_mag_u(
                &div_up_mag_u(&*_ONE_XP, lambda),
                lambda,
            ),
    };
    
    let mut q = QParams {
        a: BigInt::zero(),
        b: BigInt::zero(),
        c: BigInt::zero(),
    };
    let xp = x - &ab.x;
    
    if xp > BigInt::zero() {
        q.b = mul_up_xp_to_np_u(
            &mul_down_mag_u(&mul_down_mag_u(&(-&xp), s), c),
            &div_xp_u(&lam_bar.y, d_sq),
        );
    } else {
        q.b = mul_up_xp_to_np_u(
            &mul_up_mag_u(&mul_up_mag_u(&(-&xp), s), c),
            &(&div_xp_u(&lam_bar.x, d_sq) + BigInt::from(1u64)),
        );
    }
    
    let s_term = Vector2 {
        x: div_xp_u(
            &mul_down_mag_u(&mul_down_mag_u(&lam_bar.y, s), s),
            d_sq,
        ),
        y: div_xp_u(
            &mul_up_mag_u(&mul_up_mag_u(&lam_bar.x, s), s),
            &(d_sq + BigInt::from(1u64)),
        ) + BigInt::from(1u64),
    };
    
    let s_term_x = &*_ONE_XP - &s_term.x;
    let s_term_y = &*_ONE_XP - &s_term.y;
    
    q.c = -calc_xp_xp_div_lambda_lambda(x, r, lambda, s, c, tau_beta, d_sq);
    q.c = &q.c + mul_down_xp_to_np_u(
        &mul_down_mag_u(&r.y, &r.y),
        &s_term_y,
    );
    
    q.c = if q.c > BigInt::zero() {
        gyro_pool_math_sqrt(&q.c, 5)
    } else {
        BigInt::zero()
    };
    
    if &q.b - &q.c > BigInt::zero() {
        q.a = mul_up_xp_to_np_u(
            &(&q.b - &q.c),
            &(&div_xp_u(&*_ONE_XP, &s_term_y) + BigInt::from(1u64)),
        );
    } else {
        q.a = mul_up_xp_to_np_u(
            &(&q.b - &q.c),
            &div_xp_u(&*_ONE_XP, &s_term_x),
        );
    }
    
    q.a + &ab.y
}

fn calc_xp_xp_div_lambda_lambda(
    x: &BigInt,
    r: &Vector2,
    lambda: &BigInt,
    s: &BigInt,
    c: &BigInt,
    tau_beta: &Vector2,
    d_sq: &BigInt,
) -> BigInt {
    let sq_vars = Vector2 {
        x: mul_xp_u(d_sq, d_sq),
        y: mul_up_mag_u(&r.x, &r.x),
    };
    
    let mut q = QParams {
        a: BigInt::zero(),
        b: BigInt::zero(),
        c: BigInt::zero(),
    };
    let term_xp = div_xp_u(
        &mul_xp_u(&tau_beta.x, &tau_beta.y),
        &sq_vars.x,
    );
    
    if term_xp > BigInt::zero() {
        q.a = mul_up_mag_u(&sq_vars.y, &(s * BigInt::from(2u64)));
        q.a = mul_up_xp_to_np_u(
            &mul_up_mag_u(&q.a, c),
            &(&term_xp + BigInt::from(7u64)),
        );
    } else {
        q.a = mul_down_mag_u(&r.y, &r.y);
        q.a = mul_down_mag_u(&q.a, &(s * BigInt::from(2u64)));
        q.a = mul_up_xp_to_np_u(
            &mul_down_mag_u(&q.a, c),
            &term_xp,
        );
    }
    
    if tau_beta.x < BigInt::zero() {
        q.b = mul_up_xp_to_np_u(
            &mul_up_mag_u(&mul_up_mag_u(&r.x, x), &(c * BigInt::from(2u64))),
            &(&(-&div_xp_u(&tau_beta.x, d_sq)) + BigInt::from(3u64)),
        );
    } else {
        q.b = mul_up_xp_to_np_u(
            &mul_down_mag_u(&mul_down_mag_u(&(-&r.y), x), &(c * BigInt::from(2u64))),
            &div_xp_u(&tau_beta.x, d_sq),
        );
    }
    q.a = &q.a + &q.b;
    
    let term_xp2 = div_xp_u(
        &mul_xp_u(&tau_beta.y, &tau_beta.y),
        &sq_vars.x,
    ) + BigInt::from(7u64);
    
    q.b = mul_up_mag_u(&sq_vars.y, s);
    q.b = mul_up_xp_to_np_u(
        &mul_up_mag_u(&q.b, s),
        &term_xp2,
    );
    
    q.c = mul_up_xp_to_np_u(
        &mul_down_mag_u(&mul_down_mag_u(&(-&r.y), x), &(s * BigInt::from(2u64))),
        &div_xp_u(&tau_beta.y, d_sq),
    );
    
    q.b = &q.b + &q.c + mul_up_mag_u(x, x);
    q.b = if q.b > BigInt::zero() {
        div_up_mag_u(&q.b, lambda)
    } else {
        div_down_mag_u(&q.b, lambda)
    };
    
    q.a = &q.a + &q.b;
    q.a = if q.a > BigInt::zero() {
        div_up_mag_u(&q.a, lambda)
    } else {
        div_down_mag_u(&q.a, lambda)
    };
    
    let term_xp2 = div_xp_u(
        &mul_xp_u(&tau_beta.x, &tau_beta.x),
        &sq_vars.x,
    ) + BigInt::from(7u64);
    
    let val = mul_up_mag_u(&mul_up_mag_u(&sq_vars.y, c), c);
    mul_up_xp_to_np_u(&val, &term_xp2) + &q.a
}

fn calc_y_given_x(
    x: &BigInt,
    params: &EclpParams,
    d: &DerivedEclpParams,
    r: &Vector2,
) -> BigInt {
    let ab = Vector2 {
        x: virtual_offset0(params, d, r),
        y: virtual_offset1(params, d, r),
    };
    solve_quadratic_swap(&params.lambda, x, &params.s, &params.c, r, &ab, &d.tau_beta, &d.d_sq)
}

fn calc_x_given_y(
    y: &BigInt,
    params: &EclpParams,
    d: &DerivedEclpParams,
    r: &Vector2,
) -> BigInt {
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
            x: -&d.tau_alpha.x,
            y: d.tau_alpha.y.clone(),
        },
        &d.d_sq,
    )
}

fn check_asset_bounds(
    params: &EclpParams,
    derived: &DerivedEclpParams,
    invariant: &Vector2,
    new_bal: &BigInt,
    asset_index: usize,
) -> Result<(), PoolError> {
    if asset_index == 0 {
        let x_plus = max_balances0(params, derived, invariant);
        if new_bal > &*_MAX_BALANCES || new_bal > &x_plus {
            return Err(PoolError::InvalidInput("Asset bounds exceeded".to_string()));
        }
    } else {
        let y_plus = max_balances1(params, derived, invariant);
        if new_bal > &*_MAX_BALANCES || new_bal > &y_plus {
            return Err(PoolError::InvalidInput("Asset bounds exceeded".to_string()));
        }
    }
    Ok(())
}

pub fn calc_out_given_in(
    balances: &[BigInt],
    amount_in: &BigInt,
    token_in_is_token0: bool,
    params: &EclpParams,
    derived: &DerivedEclpParams,
    invariant: &Vector2,
) -> Result<BigInt, PoolError> {
    let bal_in_new = if token_in_is_token0 {
        let bal_in_new = &balances[0] + amount_in;
        check_asset_bounds(params, derived, invariant, &bal_in_new, 0)?;
        let bal_out_new = calc_y_given_x(&bal_in_new, params, derived, invariant);
        &balances[1] - &bal_out_new
    } else {
        let bal_in_new = &balances[1] + amount_in;
        check_asset_bounds(params, derived, invariant, &bal_in_new, 1)?;
        let bal_out_new = calc_x_given_y(&bal_in_new, params, derived, invariant);
        &balances[0] - &bal_out_new
    };
    Ok(bal_in_new)
}

pub fn calc_in_given_out(
    balances: &[BigInt],
    amount_out: &BigInt,
    token_in_is_token0: bool,
    params: &EclpParams,
    derived: &DerivedEclpParams,
    invariant: &Vector2,
) -> Result<BigInt, PoolError> {
    if token_in_is_token0 {
        if amount_out > &balances[1] {
            return Err(PoolError::InvalidInput("Asset bounds exceeded".to_string()));
        }
        let bal_out_new = &balances[1] - amount_out;
        let bal_in_new = calc_x_given_y(&bal_out_new, params, derived, invariant);
        check_asset_bounds(params, derived, invariant, &bal_in_new, 0)?;
        Ok(&bal_in_new - &balances[0])
    } else {
        if amount_out > &balances[0] {
            return Err(PoolError::InvalidInput("Asset bounds exceeded".to_string()));
        }
        let bal_out_new = &balances[0] - amount_out;
        let bal_in_new = calc_y_given_x(&bal_out_new, params, derived, invariant);
        check_asset_bounds(params, derived, invariant, &bal_in_new, 1)?;
        Ok(&bal_in_new - &balances[1])
    }
}

pub fn compute_balance(
    balances: &[BigInt],
    token_index: usize,
    invariant_ratio: &BigInt,
    params: &EclpParams,
    derived: &DerivedEclpParams,
) -> Result<BigInt, PoolError> {
    if balances.len() != 2 {
        return Err(PoolError::InvalidInput("Gyro ECLP pools must have exactly 2 tokens".to_string()));
    }
    
    if token_index >= 2 {
        return Err(PoolError::InvalidInput("Invalid token index".to_string()));
    }
    
    // Calculate current invariant with error
    let (current_invariant, inv_err) = calculate_invariant_with_error(balances, params, derived)?;
    
    // The invariant vector contains the rounded up and rounded down invariant. Both are needed when computing
    // the virtual offsets. Depending on tauAlpha and tauBeta values, we want to use the invariant rounded up
    // or rounded down to make sure we're conservative in the output.
    let invariant = Vector2 {
        x: mul_up_fixed(&(&current_invariant + &inv_err), invariant_ratio),
        y: mul_up_fixed(&(&current_invariant - &inv_err), invariant_ratio),
    };
    
    // Edge case check. Should never happen except for insane tokens. If this is hit, actually adding the
    // tokens would lead to a revert or (if it went through) a deadlock downstream, so we catch it here.
    if invariant.x > *MAX_INVARIANT {
        return Err(PoolError::InvalidInput("GyroECLPMath.MaxInvariantExceeded".to_string()));
    }
    
    if token_index == 0 {
        Ok(calc_x_given_y(&balances[1], params, derived, &invariant))
    } else {
        Ok(calc_y_given_x(&balances[0], params, derived, &invariant))
    }
}

