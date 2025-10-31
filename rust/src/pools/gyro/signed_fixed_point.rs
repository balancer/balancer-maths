use alloy_primitives::{uint, I256};

pub const ONE: I256 = I256::from_raw(uint!(1000000000000000000_U256)); // 1e18
pub const ONE_E_19: I256 = I256::from_raw(uint!(10000000000000000000_U256)); // 1e19
pub const ONE_XP: I256 = I256::from_raw(uint!(100000000000000000000000000000000000000_U256)); // 1e38

#[derive(Debug)]
pub struct FixedPointError(pub &'static str);

pub fn mul_down_mag(a: &I256, b: &I256) -> I256 {
    (*a * *b) / ONE
}

pub fn mul_up_mag(a: &I256, b: &I256) -> I256 {
    let product = *a * *b;
    if product > I256::ZERO {
        (product - I256::ONE) / ONE + I256::ONE
    } else if product < I256::ZERO {
        (product + I256::ONE) / ONE - I256::ONE
    } else {
        I256::ZERO
    }
}

pub fn div_down_mag(a: &I256, b: &I256) -> I256 {
    if b.is_zero() {
        panic!("ZeroDivision");
    }
    if a.is_zero() {
        return I256::ZERO;
    }
    let a_inflated = *a * ONE;
    a_inflated / *b
}

pub fn div_up_mag(a: &I256, b: &I256) -> I256 {
    if b.is_zero() {
        panic!("ZeroDivision");
    }
    if a.is_zero() {
        return I256::ZERO;
    }
    let mut local_a = *a;
    let mut local_b = *b;
    if b < &I256::ZERO {
        local_b = -local_b;
        local_a = -local_a;
    }
    let a_inflated = local_a * ONE;
    if a_inflated > I256::ZERO {
        (a_inflated - I256::ONE) / local_b + I256::ONE
    } else {
        (a_inflated + I256::ONE) / local_b - I256::ONE
    }
}

// Signed versions of XP functions
pub fn mul_xp_u(a: &I256, b: &I256) -> I256 {
    (*a * *b) / ONE_XP
}

pub fn div_xp_u(a: &I256, b: &I256) -> I256 {
    if b.is_zero() {
        panic!("ZeroDivision");
    }
    (*a * ONE_XP) / *b
}

pub fn mul_down_xp_to_np(a: &I256, b: &I256) -> I256 {
    let b1 = *b / ONE_E_19;
    let b2 = *b % ONE_E_19;
    let prod1 = *a * b1;
    let prod2 = *a * b2;

    if prod1 >= I256::ZERO && prod2 >= I256::ZERO {
        let prod2_div_e19 = prod2 / ONE_E_19;
        (prod1 + prod2_div_e19) / ONE_E_19
    } else {
        let prod2_div_e19 = prod2 / ONE_E_19;
        (prod1 + prod2_div_e19 + I256::ONE) / ONE_E_19 - I256::ONE
    }
}

pub fn mul_up_xp_to_np(a: &I256, b: &I256) -> I256 {
    let b1 = *b / ONE_E_19;
    let b2 = *b % ONE_E_19;
    let prod1 = *a * b1;
    let prod2 = *a * b2;

    if prod1 <= I256::ZERO && prod2 <= I256::ZERO {
        let prod2_div_e19 = prod2 / ONE_E_19;
        (prod1 + prod2_div_e19) / ONE_E_19
    } else {
        let prod2_div_e19 = prod2 / ONE_E_19;
        (prod1 + prod2_div_e19 - I256::ONE) / ONE_E_19 + I256::ONE
    }
}
