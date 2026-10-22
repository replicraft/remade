mod auth;
mod config;
mod db;
mod profile;
mod provider;
mod requests;
mod security;
mod session;

use config::Config;
use futures_util::StreamExt;
use provider::Provider;
use worker::*;

#[event(fetch)]
async fn fetch(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    let config = match Config::load(&env) {
        Ok(config) => config,
        Err(_) => {
            let mut response = Response::error("Authentication unavailable", 503)?;
            response.headers_mut().set("Cache-Control", "no-store")?;
            return Ok(response);
        }
    };
    let origin = req.headers().get("Origin")?;
    let result = if config.local && req.url()?.origin().ascii_serialization() != config.api {
        console_error!("Auth configuration: request origin does not match API_ORIGIN");
        Response::error("Authentication unavailable", 503)
    } else {
        route(&req, &env, &config).await
    };
    let mut response = match result {
        Ok(response) => response,
        // Do not log or expose provider responses, URLs, cookies, or D1 errors.
        Err(_) => Response::error("Authentication unavailable", 503)?,
    };
    let clear_flow =
        response.status_code() >= 400 && response.headers().get("Set-Cookie")?.is_none();
    if let Some(provider) = callback_provider(&req.path()).filter(|_| clear_flow) {
        response.headers_mut().append(
            "Set-Cookie",
            &config.cookie(config.flow_name(provider), "", 0),
        )?;
    }
    response.headers_mut().set("Cache-Control", "no-store")?;
    response
        .headers_mut()
        .set("Referrer-Policy", "no-referrer")?;
    response
        .headers_mut()
        .set("X-Content-Type-Options", "nosniff")?;
    response.headers_mut().set("Vary", "Origin")?;
    if origin.as_deref() == Some(config.frontend.as_str()) {
        response
            .headers_mut()
            .set("Access-Control-Allow-Origin", &config.frontend)?;
        response
            .headers_mut()
            .set("Access-Control-Allow-Credentials", "true")?;
    }
    Ok(response)
}

async fn route(req: &Request, env: &Env, config: &Config) -> Result<Response> {
    let path = req.path();
    let allowed = match path.as_str() {
        "/api/v1/auth/github"
        | "/api/v1/auth/github/callback"
        | "/api/v1/auth/discord"
        | "/api/v1/auth/discord/callback"
        | "/api/v1/auth/me" => "GET",
        "/api/v1/auth/logout" => "POST",
        "/api/v1/requests/activity" => "GET",
        _ if requests::action_path(&path).is_some() => "POST",
        _ => return Response::error("Not found", 404),
    };
    if req.url()?.as_str().len() > 4096
        || req
            .headers()
            .entries()
            .map(|(k, v)| k.len() + v.len())
            .sum::<usize>()
            > 16384
    {
        return Response::error("Request too large", 431);
    }
    if req.method() == Method::Options {
        if req.headers().get("Origin")?.as_deref() != Some(&config.frontend)
            || req
                .headers()
                .get("Access-Control-Request-Method")?
                .as_deref()
                != Some(allowed)
            || req
                .headers()
                .get("Access-Control-Request-Headers")?
                .is_some_and(|v| !v.is_empty())
        {
            return Response::error("Forbidden", 403);
        }
        let mut response = Response::empty()?.with_status(204);
        response
            .headers_mut()
            .set("Access-Control-Allow-Methods", allowed)?;
        return Ok(response);
    }
    if req.method().as_ref() != allowed {
        let mut response = Response::error("Method not allowed", 405)?;
        response.headers_mut().set("Allow", allowed)?;
        return Ok(response);
    }
    if req.method() == Method::Post {
        if req.headers().get("Origin")?.as_deref() != Some(&config.frontend)
            || req
                .headers()
                .get("Sec-Fetch-Site")?
                .is_some_and(|v| v != "same-site" && v != "same-origin")
        {
            return Response::error("Forbidden", 403);
        }
        if req
            .headers()
            .get("Content-Length")?
            .is_some_and(|v| v != "0")
            || req.headers().get("Transfer-Encoding")?.is_some()
        {
            return Response::error("Request body not accepted", 413);
        }
        // Incoming empty POSTs can still have a closed stream. Reject any data
        // without buffering the entire body, including requests without a length.
        if req.inner().body().is_some() {
            let mut input = req.clone()?;
            if input.stream()?.next().await.is_some() {
                return Response::error("Request body not accepted", 413);
            }
        }
    }
    match path.as_str() {
        "/api/v1/auth/github" => auth::begin(env, config, Provider::Github),
        "/api/v1/auth/discord" => auth::begin(env, config, Provider::Discord),
        "/api/v1/auth/github/callback" => auth::callback(req, env, config, Provider::Github).await,
        "/api/v1/auth/discord/callback" => {
            auth::callback(req, env, config, Provider::Discord).await
        }
        "/api/v1/auth/me" => session::me(req, env, config).await,
        "/api/v1/auth/logout" => session::logout(req, env, config).await,
        "/api/v1/requests/activity" => requests::activity(req, env, config).await,
        _ if requests::action_path(&path).is_some() => requests::change(req, env, config).await,
        _ => unreachable!(),
    }
}

fn callback_provider(path: &str) -> Option<Provider> {
    match path {
        "/api/v1/auth/github/callback" => Some(Provider::Github),
        "/api/v1/auth/discord/callback" => Some(Provider::Discord),
        _ => None,
    }
}
