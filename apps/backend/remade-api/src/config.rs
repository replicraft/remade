use crate::{provider::Provider, security::unavailable};
use url::Url;
use worker::{Env, Result};

pub struct Config {
    pub frontend: String,
    pub api: String,
    pub local: bool,
}

impl Config {
    pub fn load(env: &Env) -> Result<Self> {
        let frontend = env.var("FRONTEND_ORIGIN").map_err(|_| {
            worker::console_error!(
                "Auth configuration: FRONTEND_ORIGIN binding is missing or invalid"
            );
            unavailable()
        })?;
        let api = env.var("API_ORIGIN").map_err(|_| {
            worker::console_error!("Auth configuration: API_ORIGIN binding is missing or invalid");
            unavailable()
        })?;
        Self::parse(&frontend.to_string(), &api.to_string()).inspect_err(|_| {
            worker::console_error!("Auth configuration: expected paired HTTP localhost origins or the production HTTPS origins, without paths");
        })
    }

    pub fn parse(frontend: &str, api: &str) -> Result<Self> {
        let frontend_url = Url::parse(frontend).map_err(|_| unavailable())?;
        let api_url = Url::parse(api).map_err(|_| unavailable())?;
        let is_origin = |url: &Url| {
            url.path() == "/"
                && url.query().is_none()
                && url.fragment().is_none()
                && url.username().is_empty()
                && url.password().is_none()
        };
        if !is_origin(&frontend_url) || !is_origin(&api_url) {
            return Err(unavailable());
        }
        let local = frontend_url.scheme() == "http"
            && api_url.scheme() == "http"
            && frontend_url.host_str() == Some("localhost")
            && api_url.host_str() == Some("localhost");
        if !local
            && (frontend_url.origin().ascii_serialization() != "https://remade.wiki"
                || api_url.origin().ascii_serialization() != "https://api.remade.wiki")
        {
            return Err(unavailable());
        }
        Ok(Self {
            frontend: frontend_url.origin().ascii_serialization(),
            api: api_url.origin().ascii_serialization(),
            local,
        })
    }

    pub fn callback(&self, provider: Provider) -> String {
        format!("{}/api/v1/auth/{}/callback", self.api, provider.name())
    }

    pub fn session_name(&self) -> &str {
        if self.local {
            "remade_session_dev"
        } else {
            "__Host-remade_session"
        }
    }

    pub fn flow_name(&self, provider: Provider) -> &str {
        match (self.local, provider) {
            (true, Provider::Github) => "remade_oauth_dev",
            (false, Provider::Github) => "__Host-remade_oauth",
            (true, Provider::Discord) => "remade_discord_oauth_dev",
            (false, Provider::Discord) => "__Host-remade_discord_oauth",
        }
    }

    pub fn cookie(&self, name: &str, value: &str, max_age: u64) -> String {
        format!(
            "{name}={value}; Path=/; HttpOnly; SameSite=Lax; Max-Age={max_age}{}",
            if self.local { "" } else { "; Secure" }
        )
    }

    pub fn hint(&self, present: bool) -> String {
        format!(
            "remade_login_hint={}; Path=/; SameSite=Lax; Max-Age={}{}",
            if present { "1" } else { "" },
            if present {
                crate::security::SESSION_SECONDS
            } else {
                0
            },
            if self.local {
                ""
            } else {
                "; Secure; Domain=remade.wiki"
            }
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn production_cookies_are_secure_and_session_is_host_only() {
        let config = Config::parse("https://remade.wiki", "https://api.remade.wiki").unwrap();
        let cookie = config.cookie(config.session_name(), "value", 30);
        assert!(cookie.contains("__Host-remade_session"));
        assert!(cookie.contains("Secure"));
        assert!(cookie.contains("HttpOnly"));
        assert!(!cookie.contains("Domain="));
        assert!(config.hint(true).contains("Domain=remade.wiki"));
        assert!(Config::parse("http://remade.wiki", "http://api.remade.wiki").is_err());
        assert!(Config::parse("https://evil.example", "https://api.remade.wiki").is_err());
    }

    #[test]
    fn insecure_cookies_are_only_available_for_localhost() {
        let config = Config::parse("http://localhost:4321", "http://localhost:8787").unwrap();
        assert!(!config
            .cookie(config.session_name(), "value", 30)
            .contains("Secure"));
        assert!(!config.hint(true).contains("Domain="));
        assert_eq!(
            config.callback(Provider::Github),
            "http://localhost:8787/api/v1/auth/github/callback"
        );
    }

    #[test]
    fn provider_flows_have_separate_cookies_and_fixed_callbacks() {
        let config = Config::parse("https://remade.wiki", "https://api.remade.wiki").unwrap();
        assert_ne!(
            config.flow_name(Provider::Github),
            config.flow_name(Provider::Discord)
        );
        assert_eq!(
            config.callback(Provider::Discord),
            "https://api.remade.wiki/api/v1/auth/discord/callback"
        );
        assert!(config
            .cookie(config.flow_name(Provider::Discord), "value", 600)
            .starts_with("__Host-remade_discord_oauth="));
    }
}
