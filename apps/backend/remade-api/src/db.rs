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

async fn find_identity(
    db: &D1Database,
    provider: Provider,
    provider_id: &str,
) -> Result<Option<UserRow>> {
    db.prepare("SELECT u.id, u.display_name, u.avatar_url, i.provider, i.username FROM users u JOIN user_identities i ON i.user_id = u.id WHERE i.provider = ? AND i.provider_user_id = ?")
        .bind(&[provider.name().into(), provider_id.into()])?.first(None).await
}

pub async fn resolve_identity(db: &D1Database, profile: &Profile) -> Result<String> {
    let provider_id = profile.provider_id.clone();
    if let Some(user) = find_identity(db, profile.provider, &provider_id).await? {
        let statements = vec![
            db.prepare("UPDATE users SET display_name = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(&[optional(&profile.display_name), optional(&profile.avatar_url), user.id.clone().into()])?,
            db.prepare("UPDATE user_identities SET username = ? WHERE provider = ? AND provider_user_id = ?").bind(&[profile.username.clone().into(), profile.provider.name().into(), provider_id.into()])?,
        ];
        db.batch(statements).await?;
        return Ok(user.id);
    }
    let user_id = record_id()?;
    let identity_id = record_id()?;
    let statements = vec![
        db.prepare("INSERT INTO users (id, display_name, avatar_url) VALUES (?, ?, ?)").bind(&[user_id.clone().into(), optional(&profile.display_name), optional(&profile.avatar_url)])?,
        db.prepare("INSERT INTO user_identities (id, user_id, provider, provider_user_id, username) VALUES (?, ?, ?, ?, ?)").bind(&[identity_id.into(), user_id.clone().into(), profile.provider.name().into(), provider_id.clone().into(), profile.username.clone().into()])?,
    ];
    // D1 rolls back the entire batch if the unique identity constraint loses a race.
    if db.batch(statements).await.is_ok() {
        return Ok(user_id);
    }
    find_identity(db, profile.provider, &provider_id)
        .await?
        .map(|user| user.id)
        .ok_or_else(unavailable)
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
