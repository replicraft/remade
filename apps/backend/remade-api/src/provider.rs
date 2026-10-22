use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Provider {
    Github,
    Discord,
}

impl Provider {
    pub fn name(self) -> &'static str {
        match self {
            Self::Github => "github",
            Self::Discord => "discord",
        }
    }

    pub fn client_id_key(self) -> &'static str {
        match self {
            Self::Github => "GITHUB_CLIENT_ID",
            Self::Discord => "DISCORD_CLIENT_ID",
        }
    }

    pub fn secret_key(self) -> &'static str {
        match self {
            Self::Github => "GITHUB_CLIENT_SECRET",
            Self::Discord => "DISCORD_CLIENT_SECRET",
        }
    }

    pub fn authorize_url(self) -> &'static str {
        match self {
            Self::Github => "https://github.com/login/oauth/authorize",
            Self::Discord => "https://discord.com/oauth2/authorize",
        }
    }

    pub fn token_url(self) -> &'static str {
        match self {
            Self::Github => "https://github.com/login/oauth/access_token",
            Self::Discord => "https://discord.com/api/oauth2/token",
        }
    }

    pub fn user_url(self) -> &'static str {
        match self {
            Self::Github => "https://api.github.com/user",
            Self::Discord => "https://discord.com/api/v10/users/@me",
        }
    }

    pub fn scope(self) -> &'static str {
        match self {
            Self::Github => "",
            Self::Discord => "identify",
        }
    }

    pub fn accepts_issuer(self, issuer: Option<&str>) -> bool {
        match self {
            Self::Github => issuer.is_none() || issuer == Some("https://github.com"),
            Self::Discord => issuer == Some("https://discord.com"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn discord_requires_its_exact_issuer_and_github_keeps_its_existing_flow() {
        assert!(Provider::Github.accepts_issuer(None));
        assert!(Provider::Discord.accepts_issuer(Some("https://discord.com")));
        for issuer in [
            None,
            Some("https://github.com"),
            Some("https://discord.com.evil.example"),
            Some("http://discord.com"),
        ] {
            assert!(!Provider::Discord.accepts_issuer(issuer));
        }
        assert!(!Provider::Github.accepts_issuer(Some("https://discord.com")));
    }
}
