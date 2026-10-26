use crate::{config::Config, security};
use futures_util::{
    future::{select, Either},
    StreamExt,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{borrow::Cow, collections::BTreeSet, time::Duration};
use worker::*;

const SEED: &str = include_str!(concat!(env!("OUT_DIR"), "/request-slugs.txt"));
const CACHE_NAME: &str = "remade-request-slugs-v1";
const SOURCE: &str = "https://api.github.com/repos/replicraft/remade/git/trees/main?recursive=1";
const PREFIX: &str = "apps/frontend/remade-wiki/src/content/catalog/requests/";
const MAX_BYTES: usize = 2 * 1024 * 1024;

#[derive(Deserialize)]
struct GitTree {
    sha: String,
    truncated: bool,
    tree: Vec<GitEntry>,
}

#[derive(Deserialize)]
struct GitEntry {
    path: String,
    #[serde(rename = "type")]
    kind: String,
}

#[derive(Deserialize, Serialize)]
enum Refresh {
    Checked,
    Unavailable,
}

pub fn valid_slug(slug: &str) -> bool {
    !slug.is_empty()
        && slug.len() <= 250
        && !slug.starts_with('-')
        && !slug.ends_with('-')
        && !slug.contains("--")
        && slug
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
}

fn contains_text(text: &str, slug: &str) -> bool {
    text.lines().any(|line| line == slug)
}

fn valid_text(text: &str) -> bool {
    if text.len() > MAX_BYTES {
        return false;
    }
    let mut previous = None;
    for slug in text.lines() {
        if !valid_slug(slug) || previous.is_some_and(|previous| previous >= slug) {
            return false;
        }
        previous = Some(slug);
    }
    true
}

fn tree_text(bytes: &[u8]) -> std::result::Result<String, ()> {
    if bytes.len() > MAX_BYTES {
        return Err(());
    }
    let tree: GitTree = serde_json::from_slice(bytes).map_err(|_| ())?;
    if tree.truncated || tree.sha.len() != 40 || !tree.sha.bytes().all(|b| b.is_ascii_hexdigit()) {
        return Err(());
    }
    let mut slugs = BTreeSet::new();
    for entry in tree.tree {
        if entry.kind != "blob" {
            continue;
        }
        let Some(relative) = entry.path.strip_prefix(PREFIX) else {
            continue;
        };
        let Some(filename) = relative.rsplit('/').next() else {
            continue;
        };
        let Some(slug) = filename.strip_suffix(".yaml") else {
            continue;
        };
        if !valid_slug(slug) || !slugs.insert(slug.to_owned()) {
            return Err(());
        }
    }
    Ok(slugs.into_iter().collect::<Vec<_>>().join("\n"))
}

fn snapshot_key(config: &Config) -> String {
    // A deployment with a different bundled seed starts with a separate snapshot.
    format!(
        "{}/__internal/request-slugs/v1/{:x}.txt",
        config.api,
        Sha256::digest(SEED.as_bytes())
    )
}

async fn cached_text(cache: &Cache, key: &str) -> Option<String> {
    if let Ok(Some(mut response)) = cache.get(key, false).await {
        if let Ok(text) = response.text().await {
            if valid_text(&text) {
                return Some(text);
            }
        }
    }
    None
}

async fn read_text(cache: &Cache, key: &str) -> Cow<'static, str> {
    cached_text(cache, key)
        .await
        .map(Cow::Owned)
        .unwrap_or(Cow::Borrowed(SEED))
}

pub async fn snapshot(config: &Config) -> Cow<'static, str> {
    let cache = Cache::open(CACHE_NAME.into()).await;
    read_text(&cache, &snapshot_key(config)).await
}

async fn fetch_text() -> Result<String> {
    let headers = Headers::new();
    headers.set("User-Agent", "Remade-Request-Catalog")?;
    headers.set("Accept", "application/vnd.github+json")?;
    let request = Request::new_with_init(
        SOURCE,
        RequestInit::new()
            .with_method(Method::Get)
            .with_redirect(RequestRedirect::Manual)
            .with_headers(headers),
    )?;
    let controller = AbortController::default();
    let signal = controller.signal();
    let operation = async move {
        let mut response = Fetch::Request(request).send_with_signal(&signal).await?;
        if response.status_code() != 200 {
            return Err(security::unavailable());
        }
        let mut stream = response.stream()?;
        let mut bytes = Vec::new();
        while let Some(chunk) = stream.next().await {
            let chunk = chunk?;
            if bytes.len() + chunk.len() > MAX_BYTES {
                return Err(security::unavailable());
            }
            bytes.extend(chunk);
        }
        tree_text(&bytes).map_err(|_| security::unavailable())
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

async fn mark(cache: &Cache, key: &str, state: Refresh, ttl: u32) {
    if let Ok(mut response) = Response::from_json(&state) {
        if response
            .headers_mut()
            .set("Cache-Control", &format!("public, max-age={ttl}"))
            .is_ok()
        {
            let _ = cache.put(key, response).await;
        }
    }
}

pub async fn contains(slug: &str, config: &Config) -> Result<bool> {
    if !valid_slug(slug) {
        return Ok(false);
    }
    let cache = Cache::open(CACHE_NAME.into()).await;
    let key = snapshot_key(config);
    let text = read_text(&cache, &key).await;
    if contains_text(&text, slug) {
        return Ok(true);
    }

    let marker = format!("{key}/refresh");
    if let Ok(Some(mut response)) = cache.get(marker.as_str(), false).await {
        return match response.json::<Refresh>().await {
            Ok(Refresh::Checked) => cached_text(&cache, &key)
                .await
                .map(|text| contains_text(&text, slug))
                .ok_or_else(security::unavailable),
            _ => Err(security::unavailable()),
        };
    }
    // Briefly suppress repeated misses, including while another refresh is running.
    mark(&cache, &marker, Refresh::Unavailable, 60).await;
    let updated = match fetch_text().await {
        Ok(text) => text,
        Err(error) => {
            mark(&cache, &marker, Refresh::Unavailable, 15).await;
            return Err(error);
        }
    };
    let found = contains_text(&updated, slug);
    let mut response = Response::ok(&updated)?;
    response
        .headers_mut()
        .set("Content-Type", "text/plain; charset=utf-8")?;
    response
        .headers_mut()
        .set("Cache-Control", "public, max-age=86400")?;
    // Replace the entire snapshot so removed requests disappear too.
    if cache.put(key.as_str(), response).await.is_ok() {
        mark(&cache, &marker, Refresh::Checked, 60).await;
    } else {
        mark(&cache, &marker, Refresh::Unavailable, 15).await;
    }
    Ok(found)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tree(entries: serde_json::Value) -> Vec<u8> {
        serde_json::to_vec(
            &serde_json::json!({ "sha": "a".repeat(40), "truncated": false, "tree": entries }),
        )
        .unwrap()
    }

    #[test]
    fn validates_and_sorts_only_canonical_request_files() {
        let bytes = tree(serde_json::json!([
            { "path": format!("{PREFIX}vendor/zebra.yaml"), "type": "blob" },
            { "path": "docs/other.yaml", "type": "blob" },
            { "path": format!("{PREFIX}vendor/alpha.yaml"), "type": "blob" },
            { "path": format!("{PREFIX}vendor"), "type": "tree" }
        ]));
        assert_eq!(tree_text(&bytes).unwrap(), "alpha\nzebra");
    }

    #[test]
    fn rejects_partial_malformed_oversized_and_duplicate_snapshots() {
        let mut truncated: serde_json::Value =
            serde_json::from_slice(&tree(serde_json::json!([]))).unwrap();
        truncated["truncated"] = true.into();
        assert!(tree_text(&serde_json::to_vec(&truncated).unwrap()).is_err());
        assert!(tree_text(b"{}").is_err());
        assert!(tree_text(&vec![b' '; MAX_BYTES + 1]).is_err());
        for slugs in [["same", "same"], ["valid", "UPPER"]] {
            let entries = serde_json::json!([
                {"path": format!("{PREFIX}first/{}.yaml", slugs[0]), "type": "blob"},
                {"path": format!("{PREFIX}second/{}.yaml", slugs[1]), "type": "blob"}
            ]);
            assert!(tree_text(&tree(entries)).is_err());
        }
    }

    #[test]
    fn text_lookups_are_exact_and_do_not_resurrect_removed_seed_ids() {
        assert!(valid_text(SEED));
        assert!(valid_text("alpha\nzebra"));
        assert!(!valid_text("zebra\nalpha"));
        assert!(!valid_text("alpha\nalpha"));
        assert!(contains_text("alpha\nzebra", "alpha"));
        assert!(!contains_text("alpha\nzebra", "alp"));
        assert!(!contains_text("new-request", SEED.lines().next().unwrap()));
        for bad in ["", "../other", "a/b", "a%2fb", "UPPER", "a--b", "-a", "a-"] {
            assert!(!valid_slug(bad));
        }
    }
}
