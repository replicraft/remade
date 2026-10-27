use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use hmac::{Hmac, Mac};
use sha2::{Digest, Sha256};
use wasm_bindgen::JsCast;
use worker::{Error, Result};

pub const SESSION_SECONDS: u64 = 30 * 24 * 60 * 60;
pub const FLOW_SECONDS: u64 = 600;

pub fn now() -> u64 {
    (js_sys::Date::now() / 1000.0) as u64
}

pub fn random_bytes<const N: usize>() -> Result<[u8; N]> {
    let global: web_sys::WorkerGlobalScope = js_sys::global().unchecked_into();
    let mut bytes = [0; N];
    global
        .crypto()?
        .get_random_values_with_u8_array(&mut bytes)?;
    Ok(bytes)
}

pub fn token() -> Result<String> {
    Ok(URL_SAFE_NO_PAD.encode(random_bytes::<32>()?))
}

pub fn record_id() -> Result<String> {
    Ok(uuid::Builder::from_unix_timestamp_millis(
        js_sys::Date::now() as u64,
        &random_bytes::<10>()?,
    )
    .into_uuid()
    .to_string())
}

pub fn challenge(verifier: &str) -> String {
    URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()))
}

pub fn token_hash(token: &str) -> String {
    Sha256::digest(token.as_bytes())
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

pub fn valid_token(value: &str) -> bool {
    value.len() == 43
        && URL_SAFE_NO_PAD
            .decode(value)
            .is_ok_and(|bytes| bytes.len() == 32)
}

// Authenticate the expiry and verifier as well as the browser's random state.
pub fn flow_cookie(state: &str, verifier: &str, expires: u64, secret: &str) -> String {
    let payload = format!("{state}.{verifier}.{expires}");
    let mut mac =
        Hmac::<Sha256>::new_from_slice(secret.as_bytes()).expect("HMAC accepts any key length");
    mac.update(payload.as_bytes());
    format!(
        "{payload}.{}",
        URL_SAFE_NO_PAD.encode(mac.finalize().into_bytes())
    )
}

pub fn validate_flow(value: &str, state: &str, time: u64, secret: &str) -> Option<String> {
    if value.len() > 200 || !valid_token(state) {
        return None;
    }
    let parts: Vec<_> = value.split('.').collect();
    if parts.len() != 4 || parts[0] != state || !valid_token(parts[1]) {
        return None;
    }
    let expires: u64 = parts[2].parse().ok()?;
    if expires <= time || expires > time.checked_add(FLOW_SECONDS)? {
        return None;
    }
    let signature = URL_SAFE_NO_PAD.decode(parts[3]).ok()?;
    let payload = format!("{}.{}.{}", parts[0], parts[1], parts[2]);
    let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes()).ok()?;
    mac.update(payload.as_bytes());
    mac.verify_slice(&signature).ok()?;
    Some(parts[1].to_owned())
}

// A linking authorization is bound to the exact initiating session, not just a browser.
pub fn link_flow_cookie(
    state: &str,
    verifier: &str,
    expires: u64,
    session_hash: &str,
    secret: &str,
) -> String {
    let payload = format!("link.{session_hash}.{state}.{verifier}.{expires}");
    let mut mac =
        Hmac::<Sha256>::new_from_slice(secret.as_bytes()).expect("HMAC accepts any key length");
    mac.update(payload.as_bytes());
    format!(
        "{payload}.{}",
        URL_SAFE_NO_PAD.encode(mac.finalize().into_bytes())
    )
}

pub fn validate_link_flow(
    value: &str,
    state: &str,
    time: u64,
    session_hash: &str,
    secret: &str,
) -> Option<String> {
    if value.len() > 300 || !valid_token(state) {
        return None;
    }
    let parts: Vec<_> = value.split('.').collect();
    if parts.len() != 6
        || parts[0] != "link"
        || parts[1] != session_hash
        || parts[2] != state
        || !valid_token(parts[3])
    {
        return None;
    }
    let expires: u64 = parts[4].parse().ok()?;
    if expires <= time || expires > time.checked_add(FLOW_SECONDS)? {
        return None;
    }
    let signature = URL_SAFE_NO_PAD.decode(parts[5]).ok()?;
    let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes()).ok()?;
    mac.update(parts[..5].join(".").as_bytes());
    mac.verify_slice(&signature).ok()?;
    Some(parts[3].to_owned())
}

pub fn cookie_value<'a>(header: &'a str, name: &str) -> Option<&'a str> {
    if header.len() > 8192 {
        return None;
    }
    let mut matches = header.split(';').filter_map(|part| {
        let (key, value) = part.trim().split_once('=')?;
        (key == name).then_some(value)
    });
    let value = matches.next()?;
    if matches.next().is_some() {
        return None;
    }
    Some(value)
}

pub fn unavailable() -> Error {
    Error::RustError("Authentication unavailable".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pkce_matches_rfc7636() {
        assert_eq!(
            challenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
            "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
        );
    }

    #[test]
    fn flow_rejects_missing_mismatched_expired_and_tampered_values() {
        let state = URL_SAFE_NO_PAD.encode([1; 32]);
        let verifier = URL_SAFE_NO_PAD.encode([2; 32]);
        let cookie = flow_cookie(&state, &verifier, 600, "secret");
        assert_eq!(validate_flow(&cookie, &state, 1, "secret"), Some(verifier));
        assert_eq!(validate_flow("", &state, 1, "secret"), None);
        assert_eq!(
            validate_flow(&cookie, &URL_SAFE_NO_PAD.encode([3; 32]), 1, "secret"),
            None
        );
        assert_eq!(validate_flow(&cookie, &state, 600, "secret"), None);
        assert_eq!(validate_flow(&cookie, &state, 1, "wrong key"), None);
        assert_eq!(
            validate_flow(&cookie.replace(".600.", ".601."), &state, 1, "secret"),
            None
        );
    }

    #[test]
    fn linking_state_cannot_be_reused_as_login_or_with_another_session() {
        let state = URL_SAFE_NO_PAD.encode([1; 32]);
        let verifier = URL_SAFE_NO_PAD.encode([2; 32]);
        let value = link_flow_cookie(&state, &verifier, 600, "session-one", "secret");
        assert_eq!(
            validate_link_flow(&value, &state, 1, "session-one", "secret"),
            Some(verifier)
        );
        assert_eq!(
            validate_link_flow(&value, &state, 1, "session-two", "secret"),
            None
        );
        assert_eq!(
            validate_link_flow(&value, &state, 600, "session-one", "secret"),
            None
        );
        assert_eq!(
            validate_link_flow(&value, &state, 1, "session-one", "wrong"),
            None
        );
        assert_eq!(validate_flow(&value, &state, 1, "secret"), None);
        assert_eq!(
            validate_link_flow(
                &flow_cookie(&state, &state, 600, "secret"),
                &state,
                1,
                "session-one",
                "secret"
            ),
            None
        );
    }

    #[test]
    fn session_tokens_are_bounded_and_hashed() {
        let token = URL_SAFE_NO_PAD.encode([4; 32]);
        assert!(valid_token(&token));
        assert!(!valid_token("bad"));
        assert_eq!(token_hash(&token).len(), 64);
        assert_ne!(token_hash(&token), token);
        assert_eq!(cookie_value("a=b; session=x", "session"), Some("x"));
        assert_eq!(cookie_value("session=x; session=y", "session"), None);
    }
}
