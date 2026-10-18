use crate::{
    config::Config,
    db::{User, UserRow},
    security::{cookie_value, now, record_id, token, token_hash, valid_token, SESSION_SECONDS},
};
use worker::{D1Database, Request, Response, Result};

fn session_token(req: &Request, config: &Config) -> Result<Option<String>> {
    let cookies = req.headers().get("Cookie")?.unwrap_or_default();
    Ok(cookie_value(&cookies, config.session_name())
        .filter(|value| valid_token(value))
        .map(str::to_owned))
}

pub async fn user_id(req: &Request, env: &worker::Env, config: &Config) -> Result<Option<String>> {
    let Some(raw_token) = session_token(req, config)? else {
        return Ok(None);
    };
    #[derive(serde::Deserialize)]
    struct SessionUser {
        user_id: String,
    }
    let row = env
        .d1("DB")?
        .prepare("SELECT user_id FROM user_sessions WHERE token_hash = ? AND expires_at > ?")
        .bind(&[token_hash(&raw_token).into(), (now() as f64).into()])?
        .first::<SessionUser>(None)
        .await?;
    Ok(row.map(|row| row.user_id))
}

pub async fn create(db: &D1Database, user_id: &str) -> Result<String> {
    let raw_token = token()?;
    db.prepare(
        "INSERT INTO user_sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
    )
    .bind(&[
        record_id()?.into(),
        user_id.into(),
        token_hash(&raw_token).into(),
        ((now() + SESSION_SECONDS) as f64).into(),
    ])?
    .run()
    .await?;
    Ok(raw_token)
}

pub async fn me(req: &Request, env: &worker::Env, config: &Config) -> Result<Response> {
    // Anonymous and malformed tokens never cause a D1 lookup.
    let Some(raw_token) = session_token(req, config)? else {
        return Response::error("Unauthorized", 401);
    };
    let row = env.d1("DB")?.prepare("SELECT u.id, u.display_name, u.avatar_url, i.provider, i.username FROM user_sessions s JOIN users u ON u.id = s.user_id JOIN user_identities i ON i.user_id = u.id WHERE s.token_hash = ? AND s.expires_at > ? ORDER BY i.created_at, i.id")
        .bind(&[token_hash(&raw_token).into(), (now() as f64).into()])?.all().await?.results::<UserRow>()?;
    match User::from_rows(row) {
        Some(user) => Response::from_json(&user),
        None => Response::error("Unauthorized", 401),
    }
}

pub async fn logout(req: &Request, env: &worker::Env, config: &Config) -> Result<Response> {
    if let Some(raw_token) = session_token(req, config)? {
        env.d1("DB")?
            .prepare("DELETE FROM user_sessions WHERE token_hash = ?")
            .bind(&[token_hash(&raw_token).into()])?
            .run()
            .await?;
    }
    let mut response = Response::empty()?.with_status(204);
    response
        .headers_mut()
        .append("Set-Cookie", &config.cookie(config.session_name(), "", 0))?;
    response
        .headers_mut()
        .append("Set-Cookie", &config.hint(false))?;
    Ok(response)
}
