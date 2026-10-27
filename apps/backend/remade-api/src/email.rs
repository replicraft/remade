use crate::security::token_hash;
use serde::Deserialize;

#[derive(Deserialize)]
pub struct GithubEmail {
    pub email: String,
    pub verified: bool,
}

// Match case-insensitively, but never collapse dots, plus suffixes or provider aliases.
// Fingerprints minimize raw email retention; they are still private personal data.
pub fn fingerprint(value: &str) -> Option<String> {
    let value = value.trim();
    if value.len() > 254 || !value.is_ascii() || value.chars().any(char::is_whitespace) {
        return None;
    }
    let (local, domain) = value.split_once('@')?;
    if local.is_empty()
        || local.len() > 64
        || domain.contains('@')
        || !domain.contains('.')
        || value.chars().any(char::is_control)
        || domain.split('.').any(|label| {
            label.is_empty()
                || label.len() > 63
                || label.starts_with('-')
                || label.ends_with('-')
                || !label
                    .bytes()
                    .all(|b| b.is_ascii_alphanumeric() || b == b'-')
        })
    {
        return None;
    }
    Some(token_hash(&value.to_ascii_lowercase()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn verified_email_matching_preserves_alias_boundaries() {
        assert_eq!(
            fingerprint(" Example@MAIL.COM "),
            fingerprint("example@mail.com")
        );
        assert_ne!(fingerprint("a.b@mail.com"), fingerprint("ab@mail.com"));
        assert_ne!(fingerprint("a+one@mail.com"), fingerprint("a@mail.com"));
        for invalid in [
            "",
            "a",
            "@mail.com",
            "a@",
            "a@local",
            "a@b@c.com",
            "a\n@b.com",
            "a@-b.com",
        ] {
            assert_eq!(fingerprint(invalid), None);
        }
    }
}
