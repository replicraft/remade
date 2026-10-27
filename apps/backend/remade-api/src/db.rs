use crate::{
    profile::Profile,
    provider::Provider,
    security::{record_id, unavailable},
};
use serde::{Deserialize, Serialize};
use wasm_bindgen::JsValue;
use worker::{D1Database, Result};

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: String,
    pub display_name: Option<String>,
    pub avatar_url: Option<String>,
    pub identities: Vec<Identity>,
}

#[derive(Serialize, Deserialize)]
pub struct Identity {
    pub provider: Provider,
    pub username: String,
}

#[derive(Deserialize)]
pub struct UserRow {
    pub id: String,
    pub display_name: Option<String>,
    pub avatar_url: Option<String>,
    pub provider: Provider,
    pub username: String,
}

impl User {
    pub fn from_rows(rows: Vec<UserRow>) -> Option<Self> {
        let row = rows.first()?;
        Some(Self {
            id: row.id.clone(),
            display_name: row.display_name.clone(),
            avatar_url: row.avatar_url.clone(),
            identities: rows
                .into_iter()
                .map(|row| Identity {
                    provider: row.provider,
                    username: row.username,
                })
                .collect(),
        })
    }
}

#[derive(Deserialize)]
struct ExistingIdentity {
    identity_id: String,
    user_id: String,
}

pub struct LinkSession {
    pub user_id: String,
    pub session_hash: String,
}

pub enum IdentityResolution {
    User(String),
    EmailInUse,
    IdentityInUse,
}

async fn identity_resolution(
    db: &D1Database,
    profile: &Profile,
    identity: ExistingIdentity,
    link: Option<&LinkSession>,
) -> Result<IdentityResolution> {
    if let Some(session) = link.filter(|session| session.user_id != identity.user_id) {
        return merge_accounts(db, profile, &identity, session).await;
    }
    Ok(IdentityResolution::User(identity.user_id))
}

// Only explicit linking proves control of both accounts. A fresh verified provider
// address must also match an address already observed on the signed-in account.
async fn merge_accounts(
    db: &D1Database,
    profile: &Profile,
    identity: &ExistingIdentity,
    session: &LinkSession,
) -> Result<IdentityResolution> {
    let mut matching_hash = None;
    for hash in &profile.email_hashes {
        if db.prepare("SELECT e.identity_id FROM identity_emails e JOIN user_identities i ON i.id = e.identity_id WHERE e.email_hash = ? AND i.user_id = ? LIMIT 1")
            .bind(&[hash.clone().into(), session.user_id.clone().into()])?
            .first::<serde_json::Value>(None).await?.is_some() {
            matching_hash = Some(hash);
            break;
        }
    }
    let Some(hash) = matching_hash else {
        return Ok(IdentityResolution::IdentityInUse);
    };

    // This NOT NULL update guards the whole atomic batch. Recheck the exact live
    // session, source ownership and matching observation inside the transaction.
    // A concurrent logout, merge or email change must roll back all transfers.
    let mut statements = vec![db.prepare("UPDATE user_identities SET user_id = (SELECT s.user_id FROM user_sessions s WHERE s.token_hash = ? AND s.user_id = ? AND s.expires_at > ? AND EXISTS (SELECT 1 FROM identity_emails e JOIN user_identities i ON i.id = e.identity_id WHERE e.email_hash = ? AND i.user_id = s.user_id) AND user_identities.user_id = ?), username = ? WHERE id = ?")
        .bind(&[session.session_hash.clone().into(), session.user_id.clone().into(), (crate::security::now() as f64).into(), hash.clone().into(), identity.user_id.clone().into(), profile.username.clone().into(), identity.identity_id.clone().into()])?];

    // Keep the signed-in account ID. Preserve the earliest activity timestamp
    // when both accounts voted for or indicated building the same request.
    for table in ["request_upvotes", "request_builders"] {
        statements.push(db.prepare(format!("INSERT INTO {table} (original, user_id, created_at) SELECT original, ?, created_at FROM {table} WHERE user_id = ? ON CONFLICT (original, user_id) DO UPDATE SET created_at = MIN(created_at, excluded.created_at)"))
            .bind(&[session.user_id.clone().into(), identity.user_id.clone().into()])?);
    }
    statements.push(
        db.prepare("UPDATE user_identities SET user_id = ? WHERE user_id = ?")
            .bind(&[
                session.user_id.clone().into(),
                identity.user_id.clone().into(),
            ])?,
    );
    // Revoke all old sessions for both accounts; the callback issues a fresh one.
    statements.push(
        db.prepare("DELETE FROM user_sessions WHERE user_id IN (?, ?)")
            .bind(&[
                session.user_id.clone().into(),
                identity.user_id.clone().into(),
            ])?,
    );
    statements.push(
        db.prepare("DELETE FROM users WHERE id = ?")
            .bind(&[identity.user_id.clone().into()])?,
    );
    db.batch(statements).await?;
    Ok(IdentityResolution::User(session.user_id.clone()))
}

async fn find_identity(
    db: &D1Database,
    provider: Provider,
    provider_id: &str,
) -> Result<Option<ExistingIdentity>> {
    db.prepare("SELECT id AS identity_id, user_id FROM user_identities WHERE provider = ? AND provider_user_id = ?")
        .bind(&[provider.name().into(), provider_id.into()])?.first(None).await
}

async fn email_in_use(db: &D1Database, hashes: &[String], user_id: &str) -> Result<bool> {
    for chunk in hashes.chunks(80) {
        let placeholders = vec!["?"; chunk.len()].join(",");
        let sql = format!("SELECT i.user_id FROM identity_emails e JOIN user_identities i ON i.id = e.identity_id WHERE e.email_hash IN ({placeholders}) AND i.user_id <> ? LIMIT 1");
        let mut bindings: Vec<JsValue> = chunk.iter().map(|s| s.as_str().into()).collect();
        bindings.push(user_id.into());
        if db
            .prepare(sql)
            .bind(&bindings)?
            .first::<serde_json::Value>(None)
            .await?
            .is_some()
        {
            return Ok(true);
        }
    }
    Ok(false)
}

pub async fn resolve_identity(
    db: &D1Database,
    profile: &Profile,
    link: Option<&LinkSession>,
) -> Result<IdentityResolution> {
    if let Some(identity) = find_identity(db, profile.provider, &profile.provider_id).await? {
        if link.is_some_and(|session| session.user_id != identity.user_id) {
            return identity_resolution(db, profile, identity, link).await;
        }
        // Existing accounts retain access even if a legacy account shares their email.
        // Refresh observations so changed addresses do not remain permanently reserved.
        let mut statements = vec![
            db.prepare("UPDATE users SET display_name = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(&[optional(&profile.display_name), optional(&profile.avatar_url), identity.user_id.clone().into()])?,
            db.prepare("UPDATE user_identities SET username = ? WHERE id = ?").bind(&[profile.username.clone().into(), identity.identity_id.clone().into()])?,
            db.prepare("DELETE FROM identity_emails WHERE identity_id = ?").bind(&[identity.identity_id.clone().into()])?,
        ];
        for hash in &profile.email_hashes {
            statements.push(db.prepare("INSERT INTO identity_emails (identity_id, email_hash) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM identity_emails e JOIN user_identities i ON i.id = e.identity_id WHERE e.email_hash = ? AND i.user_id <> ?)")
                .bind(&[identity.identity_id.clone().into(), hash.clone().into(), hash.clone().into(), identity.user_id.clone().into()])?);
        }
        db.batch(statements).await?;
        return Ok(IdentityResolution::User(identity.user_id));
    }

    let user_id = match link {
        Some(session) => session.user_id.clone(),
        None => record_id()?,
    };
    if email_in_use(db, &profile.email_hashes, &user_id).await? {
        // A competing callback may have created this same identity after our first
        // lookup. Its provider key is authoritative; this is not a second account.
        if let Some(identity) = find_identity(db, profile.provider, &profile.provider_id).await? {
            return identity_resolution(db, profile, identity, link).await;
        }
        return Ok(IdentityResolution::EmailInUse);
    }
    let identity_id = record_id()?;
    let mut statements = Vec::new();
    if let Some(session) = link {
        // A revoked/expired initiating session makes this NOT NULL insert fail and
        // rolls back the complete batch, even if logout raced the provider request.
        statements.push(db.prepare("INSERT INTO user_identities (id, user_id, provider, provider_user_id, username) VALUES (?, (SELECT user_id FROM user_sessions WHERE token_hash = ? AND user_id = ? AND expires_at > ?), ?, ?, ?)")
            .bind(&[identity_id.clone().into(), session.session_hash.clone().into(), user_id.clone().into(), (crate::security::now() as f64).into(), profile.provider.name().into(), profile.provider_id.clone().into(), profile.username.clone().into()])?);
    } else {
        statements.push(
            db.prepare("INSERT INTO users (id, display_name, avatar_url) VALUES (?, ?, ?)")
                .bind(&[
                    user_id.clone().into(),
                    optional(&profile.display_name),
                    optional(&profile.avatar_url),
                ])?,
        );
        statements.push(db.prepare("INSERT INTO user_identities (id, user_id, provider, provider_user_id, username) VALUES (?, ?, ?, ?, ?)").bind(&[identity_id.clone().into(), user_id.clone().into(), profile.provider.name().into(), profile.provider_id.clone().into(), profile.username.clone().into()])?);
    }
    for hash in &profile.email_hashes {
        statements.push(
            db.prepare("INSERT INTO identity_emails (identity_id, email_hash) VALUES (?, ?)")
                .bind(&[identity_id.clone().into(), hash.clone().into()])?,
        );
    }
    // Identity uniqueness and the email ownership trigger arbitrate concurrent callbacks.
    if db.batch(statements).await.is_ok() {
        return Ok(IdentityResolution::User(user_id));
    }
    if let Some(identity) = find_identity(db, profile.provider, &profile.provider_id).await? {
        return identity_resolution(db, profile, identity, link).await;
    }
    if email_in_use(db, &profile.email_hashes, &user_id).await? {
        return Ok(IdentityResolution::EmailInUse);
    }
    Err(unavailable())
}

fn optional(value: &Option<String>) -> JsValue {
    value
        .as_ref()
        .map_or(JsValue::NULL, |v| JsValue::from_str(v))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn session_payload_includes_all_supported_provider_identities() {
        let row = |provider| UserRow {
            id: "user".into(),
            display_name: None,
            avatar_url: None,
            provider,
            username: "example".into(),
        };
        let user = User::from_rows(vec![row(Provider::Github), row(Provider::Discord)]).unwrap();
        assert_eq!(user.identities.len(), 2);
        assert_eq!(user.identities[1].provider, Provider::Discord);
        assert!(User::from_rows(vec![]).is_none());
    }
}
