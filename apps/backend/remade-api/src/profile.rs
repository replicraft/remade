use crate::{provider::Provider, security::unavailable};
use serde::Deserialize;
use worker::Result;

pub struct Profile {
    pub provider: Provider,
    pub provider_id: String,
    pub username: String,
    pub display_name: Option<String>,
    pub avatar_url: Option<String>,
}

#[derive(Deserialize)]
pub struct GithubUser {
    pub id: u64,
    pub login: String,
    pub name: Option<String>,
    pub avatar_url: Option<String>,
}

impl GithubUser {
    pub fn into_profile(self) -> Result<Profile> {
        if self.id == 0
            || self.login.is_empty()
            || self.login.len() > 39
            || !self
                .login
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || b == b'-')
            || self.name.as_ref().is_some_and(|v| v.len() > 256)
        {
            return Err(unavailable());
        }
        if let Some(avatar) = &self.avatar_url {
            let url = url::Url::parse(avatar).map_err(|_| unavailable())?;
            if avatar.len() > 2048
                || url.scheme() != "https"
                || url.host_str() != Some("avatars.githubusercontent.com")
                || !url.username().is_empty()
                || url.password().is_some()
            {
                return Err(unavailable());
            }
        }
        Ok(Profile {
            provider: Provider::Github,
            provider_id: self.id.to_string(),
            username: self.login,
            display_name: self.name,
            avatar_url: self.avatar_url,
        })
    }
}

#[derive(Deserialize)]
pub struct DiscordUser {
    pub id: String,
    pub username: String,
    pub global_name: Option<String>,
    pub avatar: Option<String>,
}

impl DiscordUser {
    pub fn into_profile(self) -> Result<Profile> {
        // Keep snowflakes as decimal strings, including values above JS's safe integer range.
        if !self
            .id
            .parse::<u64>()
            .is_ok_and(|id| id > 0 && id.to_string() == self.id)
            || self.username.is_empty()
            || self.username.chars().count() > 32
            || self.username.chars().any(char::is_control)
            || self
                .global_name
                .as_ref()
                .is_some_and(|v| v.len() > 256 || v.chars().any(char::is_control))
        {
            return Err(unavailable());
        }
        let avatar_url = self
            .avatar
            .map(|avatar| {
                let hash = avatar.strip_prefix("a_").unwrap_or(&avatar);
                if hash.len() != 32 || !hash.bytes().all(|b| b.is_ascii_hexdigit()) {
                    return Err(unavailable());
                }
                // Build the URL ourselves; provider data cannot introduce arbitrary origins or paths.
                Ok(format!(
                    "https://cdn.discordapp.com/avatars/{}/{avatar}.png",
                    self.id
                ))
            })
            .transpose()?;
        Ok(Profile {
            provider: Provider::Discord,
            provider_id: self.id,
            username: self.username,
            display_name: self.global_name,
            avatar_url,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn discord(id: &str, avatar: Option<&str>) -> DiscordUser {
        DiscordUser {
            id: id.into(),
            username: "example.user".into(),
            global_name: None,
            avatar: avatar.map(str::to_owned),
        }
    }

    #[test]
    fn discord_preserves_snowflakes_and_builds_only_cdn_avatar_urls() {
        let profile = discord(
            "123456789012345678",
            Some("a_0123456789abcdef0123456789abcdef"),
        )
        .into_profile()
        .unwrap();
        assert_eq!(profile.provider, Provider::Discord);
        assert_eq!(profile.provider_id, "123456789012345678");
        assert_eq!(profile.avatar_url.as_deref(), Some("https://cdn.discordapp.com/avatars/123456789012345678/a_0123456789abcdef0123456789abcdef.png"));
        assert!(discord("123", None)
            .into_profile()
            .unwrap()
            .avatar_url
            .is_none());
    }

    #[test]
    fn discord_rejects_invalid_ids_names_and_avatar_paths() {
        for id in ["0", "00123", "-1", "1e3", "18446744073709551616"] {
            assert!(discord(id, None).into_profile().is_err());
        }
        for avatar in ["../avatar", "https://evil.example/avatar", "bad"] {
            assert!(discord("123", Some(avatar)).into_profile().is_err());
        }
        let mut user = discord("123", None);
        user.username = "invalid\nname".into();
        assert!(user.into_profile().is_err());
    }
}
