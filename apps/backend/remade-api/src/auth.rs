use crate::{
    config::Config,
    db,
    profile::{DiscordUser, GithubUser, Profile},
    provider::Provider,
    security::{self, FLOW_SECONDS, SESSION_SECONDS},
    session,
};
use futures_util::{
    future::{select, Either},
    StreamExt,
};
use serde::{de::DeserializeOwned, Deserialize};
use std::time::Duration;
use url::Url;
use worker::*;

fn credentials(env: &Env, provider: Provider) -> Result<(String, String)> {
    let id = env.var(provider.client_id_key())?.to_string();
    let secret = env.secret(provider.secret_key())?.to_string();
    if id.is_empty() || id.starts_with("REPLACE_") || secret.is_empty() {
        return Err(security::unavailable());
    }
    Ok((id, secret))
}

pub fn begin(env: &Env, config: &Config, provider: Provider) -> Result<Response> {
    start(env, config, provider, None)
}

pub async fn begin_link(
    req: &Request,
    env: &Env,
    config: &Config,
    provider: Provider,
) -> Result<Response> {
    if session::user_id(req, env, config).await?.is_none() {
        return Response::error("Sign in before connecting another provider.", 401);
    }
    let hash = session::fingerprint(req, config)?.ok_or_else(security::unavailable)?;
    start(env, config, provider, Some(&hash))
}

fn start(
    env: &Env,
    config: &Config,
    provider: Provider,
    link_hash: Option<&str>,
) -> Result<Response> {
    let (client_id, secret) = credentials(env, provider)?;
    let state = security::token()?;
    let verifier = security::token()?;
    let mut authorize = Url::parse(provider.authorize_url())?;
    authorize.query_pairs_mut().extend_pairs([
        ("client_id", client_id.as_str()),
        ("redirect_uri", config.callback(provider).as_str()),
        ("state", state.as_str()),
        ("code_challenge", security::challenge(&verifier).as_str()),
        ("code_challenge_method", "S256"),
        ("scope", provider.scope()),
        ("response_type", "code"),
    ]);
    if link_hash.is_some() {
        authorize.query_pairs_mut().append_pair(
            "prompt",
            match provider {
                Provider::Github => "select_account",
                Provider::Discord => "consent",
            },
        );
    }
    let mut response = redirect(authorize.as_str())?;
    response.headers_mut().append(
        "Set-Cookie",
        &config.cookie(
            config.flow_name(provider),
            &match link_hash {
                Some(hash) => security::link_flow_cookie(
                    &state,
                    &verifier,
                    security::now() + FLOW_SECONDS,
                    hash,
                    &secret,
                ),
                None => security::flow_cookie(
                    &state,
                    &verifier,
                    security::now() + FLOW_SECONDS,
                    &secret,
                ),
            },
            FLOW_SECONDS,
        ),
    )?;
    Ok(response)
}

pub async fn callback(
    req: &Request,
    env: &Env,
    config: &Config,
    provider: Provider,
) -> Result<Response> {
    // Clear transient credentials even on rejected state, provider errors, or D1 failures.
    let result = complete(req, env, config, provider).await;
    let mut response = match result {
        Ok(response) => response,
        Err(_) => Response::error("Unable to sign in. Please start login again.", 400)?,
    };
    response.headers_mut().append(
        "Set-Cookie",
        &config.cookie(config.flow_name(provider), "", 0),
    )?;
    Ok(response)
}

async fn complete(
    req: &Request,
    env: &Env,
    config: &Config,
    provider: Provider,
) -> Result<Response> {
    let (client_id, secret) = credentials(env, provider)?;
    let url = req.url()?;
    let query: Vec<_> = url.query_pairs().collect();
    let parameter = |name: &str| -> Option<String> {
        let values: Vec<_> = query.iter().filter(|(key, _)| key == name).collect();
        if values.len() != 1 {
            return None;
        }
        Some(values[0].1.to_string())
    };
    if query.iter().filter(|(key, _)| key == "iss").count() > 1
        || !provider.accepts_issuer(parameter("iss").as_deref())
    {
        return Err(security::unavailable());
    }
    let state = parameter("state").ok_or_else(security::unavailable)?;
    let code = parameter("code")
        .filter(|v| !v.is_empty() && v.len() <= 512 && !v.chars().any(char::is_control))
        .ok_or_else(security::unavailable)?;
    if query.iter().any(|(key, _)| key == "error") {
        return Err(security::unavailable());
    }
    let cookies = req.headers().get("Cookie")?.unwrap_or_default();
    let flow = security::cookie_value(&cookies, config.flow_name(provider))
        .ok_or_else(security::unavailable)?;
    let link = if flow.starts_with("link.") {
        Some(db::LinkSession {
            user_id: session::user_id(req, env, config)
                .await?
                .ok_or_else(security::unavailable)?,
            session_hash: session::fingerprint(req, config)?.ok_or_else(security::unavailable)?,
        })
    } else {
        None
    };
    let verifier = match &link {
        Some(session) => security::validate_link_flow(
            flow,
            &state,
            security::now(),
            &session.session_hash,
            &secret,
        ),
        None => security::validate_flow(flow, &state, security::now(), &secret),
    }
    .ok_or_else(security::unavailable)?;
    let mut form = url::form_urlencoded::Serializer::new(String::new());
    form.extend_pairs([
        ("client_id", client_id.as_str()),
        ("client_secret", secret.as_str()),
        ("code", code.as_str()),
        ("redirect_uri", config.callback(provider).as_str()),
        ("code_verifier", verifier.as_str()),
    ]);
    if provider == Provider::Discord {
        form.append_pair("grant_type", "authorization_code");
    }
    let body = form.finish();
    let headers = Headers::new();
    headers.set("Accept", "application/json")?;
    headers.set("Content-Type", "application/x-www-form-urlencoded")?;
    let token_request = Request::new_with_init(
        provider.token_url(),
        RequestInit::new()
            .with_method(Method::Post)
            .with_headers(headers)
            .with_redirect(RequestRedirect::Manual)
            .with_body(Some(body.into())),
    )?;
    let exchange: TokenResponse = bounded_json(token_request).await?;
    let access_token = exchange
        .access_token
        .filter(|v| !v.is_empty() && v.len() <= 2048 && !v.chars().any(char::is_control))
        .filter(|_| {
            exchange.error.is_none()
                && exchange
                    .token_type
                    .as_deref()
                    .is_some_and(|v| v.eq_ignore_ascii_case("bearer"))
                && (provider != Provider::Discord
                    || exchange.scope.as_deref().is_some_and(|scope| {
                        ["identify", "email"].iter().all(|required| {
                            scope
                                .split_ascii_whitespace()
                                .any(|value| value == *required)
                        })
                    }))
        })
        .ok_or_else(security::unavailable)?;
    let headers = Headers::new();
    headers.set("Accept", "application/json")?;
    headers.set("Authorization", &format!("Bearer {access_token}"))?;
    headers.set("User-Agent", "Remade-Authentication")?;
    if provider == Provider::Github {
        headers.set("X-GitHub-Api-Version", "2022-11-28")?;
    }
    let user_request = Request::new_with_init(
        provider.user_url(),
        RequestInit::new()
            .with_headers(headers.clone())
            .with_redirect(RequestRedirect::Manual),
    )?;
    let mut profile: Profile = match provider {
        Provider::Github => bounded_json::<GithubUser>(user_request)
            .await?
            .into_profile()?,
        Provider::Discord => bounded_json::<DiscordUser>(user_request)
            .await?
            .into_profile()?,
    };
    if provider == Provider::Github {
        let emails: Vec<crate::email::GithubEmail> = bounded_json(Request::new_with_init(
            "https://api.github.com/user/emails?per_page=100",
            RequestInit::new()
                .with_headers(headers.clone())
                .with_redirect(RequestRedirect::Manual),
        )?)
        .await?;
        if emails.len() > 100 {
            return Err(security::unavailable());
        }
        if emails.len() == 100 {
            let extra: Vec<crate::email::GithubEmail> = bounded_json(Request::new_with_init(
                "https://api.github.com/user/emails?per_page=100&page=2",
                RequestInit::new()
                    .with_headers(headers)
                    .with_redirect(RequestRedirect::Manual),
            )?)
            .await?;
            if !extra.is_empty() {
                return Err(security::unavailable());
            }
        }
        profile.email_hashes = emails
            .into_iter()
            .filter(|email| email.verified)
            .filter_map(|email| crate::email::fingerprint(&email.email))
            .collect::<std::collections::BTreeSet<_>>()
            .into_iter()
            .collect();
    }
    if let Some(link) = &link {
        if session::user_id(req, env, config).await?.as_deref() != Some(link.user_id.as_str()) {
            return Err(security::unavailable());
        }
    }
    let db = env.d1("DB")?;
    let user_id = match db::resolve_identity(&db, &profile, link.as_ref()).await? {
        db::IdentityResolution::User(id) => id,
        db::IdentityResolution::EmailInUse => {
            return outcome(config, link.is_some(), "email_in_use", provider)
        }
        db::IdentityResolution::IdentityInUse => {
            return outcome(config, true, "identity_in_use", provider)
        }
    };
    let raw_token = session::create(&db, &user_id).await?;
    let mut response = if let Some(link) = &link {
        db.prepare("DELETE FROM user_sessions WHERE token_hash = ?")
            .bind(&[link.session_hash.clone().into()])?
            .run()
            .await?;
        let mut url = Url::parse(&format!("{}/account/", config.frontend))?;
        url.query_pairs_mut()
            .append_pair("connected", provider.name());
        redirect(url.as_str())?
    } else {
        redirect(&config.frontend)?
    };
    response.headers_mut().append(
        "Set-Cookie",
        &config.cookie(config.session_name(), &raw_token, SESSION_SECONDS),
    )?;
    response
        .headers_mut()
        .append("Set-Cookie", &config.hint(true))?;
    Ok(response)
}

fn outcome(config: &Config, linking: bool, error: &str, provider: Provider) -> Result<Response> {
    let path = if linking { "account" } else { "login" };
    let mut url = Url::parse(&format!("{}/{path}/", config.frontend))?;
    url.query_pairs_mut()
        .append_pair("auth_error", error)
        .append_pair("provider", provider.name());
    redirect(url.as_str())
}

fn redirect(url: &str) -> Result<Response> {
    // The runtime's Response.redirect has immutable headers; build a mutable
    // response so cookies and security headers can be attached safely.
    let mut response = Response::empty()?.with_status(302);
    response
        .headers_mut()
        .set("Location", Url::parse(url)?.as_str())?;
    Ok(response)
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: Option<String>,
    token_type: Option<String>,
    error: Option<String>,
    scope: Option<String>,
}

async fn bounded_json<T: DeserializeOwned>(request: Request) -> Result<T> {
    let controller = AbortController::default();
    let signal = controller.signal();
    let operation = async move {
        let mut response = Fetch::Request(request).send_with_signal(&signal).await?;
        if !(200..300).contains(&response.status_code()) {
            return Err(security::unavailable());
        }
        let mut stream = response.stream()?;
        let mut bytes = Vec::new();
        while let Some(chunk) = stream.next().await {
            let chunk = chunk?;
            if bytes.len() + chunk.len() > 65536 {
                return Err(security::unavailable());
            }
            bytes.extend(chunk);
        }
        serde_json::from_slice(&bytes).map_err(|_| security::unavailable())
    };
    match select(
        Box::pin(operation),
        Box::pin(Delay::from(Duration::from_secs(10))),
    )
    .await
    {
        Either::Left((result, _)) => result,
        Either::Right(_) => {
            controller.abort();
            Err(security::unavailable())
        }
    }
}
