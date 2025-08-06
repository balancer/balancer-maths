use lazy_static::lazy_static;
use num_bigint::BigInt;
use num_traits::{Zero, Signed, One};
use std::str::FromStr;

lazy_static! {
    pub static ref ONE: BigInt = BigInt::from(1_000_000_000_000_000_000u64); // 1e18
    pub static ref ONE_XP: BigInt = BigInt::from_str("100000000000000000000000000000000000000").unwrap(); // 1e38
}

#[derive(Debug)]
pub struct FixedPointError(pub &'static str);

pub fn add(a: &BigInt, b: &BigInt) -> BigInt {
    let c = a + b;
    // Overflow check is not needed for BigInt
    c
}

pub fn sub(a: &BigInt, b: &BigInt) -> BigInt {
    let c = a - b;
    c
}

pub fn mul_up_fixed(a: &BigInt, b: &BigInt) -> BigInt {
    let product = a * b;
    if product.is_zero() {
        BigInt::zero()
    } else {
        (&product - BigInt::from(1u64)) / &*ONE + BigInt::from(1u64)
    }
}

pub fn mul_down_mag(a: &BigInt, b: &BigInt) -> BigInt {
    (a * b) / &*ONE
}

pub fn mul_down_mag_u(a: &BigInt, b: &BigInt) -> BigInt {
    let product = a * b;
    let result = product.abs() / &*ONE;
    if product.is_negative() { -result } else { result }
}

pub fn mul_up_mag(a: &BigInt, b: &BigInt) -> BigInt {
    let product = a * b;
    if product > BigInt::zero() {
        (&product - BigInt::from(1u64)) / &*ONE + BigInt::from(1u64)
    } else if product < BigInt::zero() {
        (&product + BigInt::from(1u64)) / &*ONE - BigInt::from(1u64)
    } else {
        BigInt::zero()
    }
}

pub fn mul_up_mag_u(a: &BigInt, b: &BigInt) -> BigInt {
    let product = a * b;
    if product > BigInt::zero() {
        (&product - BigInt::from(1u64)) / &*ONE + BigInt::from(1u64)
    } else if product < BigInt::zero() {
        (&product + BigInt::from(1u64)) / &*ONE - BigInt::from(1u64)
    } else {
        BigInt::zero()
    }
}

pub fn div_down_mag(a: &BigInt, b: &BigInt) -> BigInt {
    if b.is_zero() {
        panic!("ZeroDivision");
    }
    if a.is_zero() {
        return BigInt::zero();
    }
    let a_inflated = a * &*ONE;
    a_inflated / b
}

pub fn div_down_mag_u(a: &BigInt, b: &BigInt) -> BigInt {
    if b.is_zero() {
        panic!("ZeroDivision");
    }
    let product = a * &*ONE;
    let abs_result = product.abs() / b.abs();
    if product.is_negative() != b.is_negative() { -abs_result } else { abs_result }
}

pub fn div_up_mag(a: &BigInt, b: &BigInt) -> BigInt {
    if b.is_zero() {
        panic!("ZeroDivision");
    }
    if a.is_zero() {
        return BigInt::zero();
    }
    let mut local_a = a.clone();
    let mut local_b = b.clone();
    if b < &BigInt::zero() {
        local_b = -local_b;
        local_a = -local_a;
    }
    let a_inflated = local_a * &*ONE;
    if a_inflated > BigInt::zero() {
        (&a_inflated - BigInt::from(1u64)) / &local_b + BigInt::from(1u64)
    } else {
        (&a_inflated + BigInt::from(1u64)) / &local_b - BigInt::from(1u64)
    }
}

pub fn div_up_mag_u(a: &BigInt, b: &BigInt) -> BigInt {
    if b.is_zero() {
        panic!("ZeroDivision");
    }
    if a.is_zero() {
        return BigInt::zero();
    }
    let mut local_a = a.clone();
    let mut local_b = b.clone();
    if b < &BigInt::zero() {
        local_b = -local_b;
        local_a = -local_a;
    }
    let a_inflated = local_a * &*ONE;
    if a_inflated > BigInt::zero() {
        (&a_inflated - BigInt::from(1u64)) / &local_b + BigInt::from(1u64)
    } else {
        (&a_inflated + BigInt::from(1u64)) / &local_b - BigInt::from(1u64)
    }
}

pub fn mul_xp(a: &BigInt, b: &BigInt) -> BigInt {
    (a * b) / &*ONE_XP
}

pub fn mul_xp_u(a: &BigInt, b: &BigInt) -> BigInt {
    (a * b) / &*ONE_XP
}

pub fn div_xp(a: &BigInt, b: &BigInt) -> BigInt {
    if b.is_zero() {
        panic!("ZeroDivision");
    }
    (a * &*ONE_XP) / b
}

pub fn div_xp_u(a: &BigInt, b: &BigInt) -> BigInt {
    if b.is_zero() {
        panic!("ZeroDivision");
    }
    (a * &*ONE_XP) / b
}

// These functions are used for extended precision math (XP to NP)
pub fn mul_down_xp_to_np(a: &BigInt, b: &BigInt) -> BigInt {
    let e_19 = BigInt::from(10_000_000_000_000_000_000u64);
    let b1 = b / &e_19;
    let b2 = b % &e_19;
    let prod1 = a * &b1;
    let prod2 = a * &b2;
    if prod1 >= BigInt::zero() && prod2 >= BigInt::zero() {
        (prod1 / &*ONE) * &e_19 + (prod2 / &*ONE)
    } else if prod1 <= BigInt::zero() && prod2 <= BigInt::zero() {
        (prod1 / &*ONE) * &e_19 + (prod2 / &*ONE)
    } else {
        (prod1 / &*ONE) * &e_19 + (prod2 / &*ONE)
    }
}

pub fn mul_down_xp_to_np_u(a: &BigInt, b: &BigInt) -> BigInt {
    let e_19 = BigInt::from(10_000_000_000_000_000_000u64);
    let b1 = b / &e_19;
    let b2 = b % &e_19;
    let prod1 = a * &b1;
    let prod2 = a * &b2;
    
    if prod1 >= BigInt::zero() && prod2 >= BigInt::zero() {
        let prod2_div_e19 = &prod2 / &e_19;
        (&prod1 + &prod2_div_e19) / &e_19
    } else {
        let prod2_div_e19 = &prod2 / &e_19;
        (&prod1 + &prod2_div_e19 + BigInt::from(1u64)) / &e_19 - BigInt::from(1u64)
    }
}

pub fn mul_up_xp_to_np(a: &BigInt, b: &BigInt) -> BigInt {
    let e_19 = BigInt::from(10_000_000_000_000_000_000u64);
    let b1 = b / &e_19;
    let b2 = b % &e_19;
    let prod1 = a * &b1;
    let prod2 = a * &b2;
    let mut result = (&prod1 / &*ONE) * &e_19 + (&prod2 / &*ONE);
    if (&prod1 % &*ONE != BigInt::zero()) || (&prod2 % &*ONE != BigInt::zero()) {
        result += BigInt::one();
    }
    result
}

pub fn mul_up_xp_to_np_u(a: &BigInt, b: &BigInt) -> BigInt {
    let e_19 = BigInt::from(10_000_000_000_000_000_000u64);
    let b1 = b / &e_19;
    let b2 = b % &e_19;
    let prod1 = a * &b1;
    let prod2 = a * &b2;
    
    // For division, implement truncation toward zero (like Solidity)
    let trunc_div = |x: &BigInt, y: &BigInt| -> BigInt {
        let abs_result = x.abs() / y.abs();
        if (x < &BigInt::zero()) != (y < &BigInt::zero()) {
            -abs_result
        } else {
            abs_result
        }
    };
    
    if prod1 <= BigInt::zero() && prod2 <= BigInt::zero() {
        trunc_div(&(&prod1 + &trunc_div(&prod2, &e_19)), &e_19)
    } else {
        trunc_div(&(&prod1 + &trunc_div(&prod2, &e_19) - BigInt::from(1u64)), &e_19) + BigInt::from(1u64)
    }
}

pub fn complement(x: &BigInt) -> BigInt {
    if x < &*ONE {
        &*ONE - x
    } else {
        BigInt::zero()
    }
}