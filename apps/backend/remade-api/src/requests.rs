use crate::{config::Config, request_catalog, session};
use serde::{Deserialize, Serialize};
use worker::{Env, Request, Response, Result};

pub fn action_path(path: &str) -> Option<(&str, &str)> {
    let (slug, action) = path.strip_prefix("/api/v1/requests/")?.split_once('/')?;
    if request_catalog::valid_slug(slug)
        && matches!(action, "upvote" | "unvote" | "build" | "unbuild")
    {
        Some((slug, action))
    } else {
        None
    }
}

#[derive(Default, Serialize)]
#[serde(rename_all = "camelCase")]
struct Activity {
    original: String,
    upvotes: u64,
    builders: u64,
    upvoted: bool,
    building: bool,
}

#[derive(Deserialize)]
struct Row {
    original: String,
    kind: String,
    count: u64,
    selected: u64,
}

pub async fn activity(req: &Request, env: &Env, config: &Config) -> Result<Response> {
    let url = req.url()?;
    let mut originals = url.query_pairs().filter(|(key, _)| key == "original");
    if let Some((_, original)) = originals.next() {
        if originals.next().is_some() || !request_catalog::valid_slug(&original) {
            return Response::error("Invalid request ID", 400);
        }
        match request_catalog::contains(&original, config).await {
            Ok(true) => {}
            Ok(false) => return Response::error("Request not found", 404),
            Err(_) => {
                return Response::error("Request catalog unavailable. Please try again later.", 503)
            }
        }
    }
    let user = session::user_id(req, env, config)
        .await?
        .unwrap_or_default();
    let rows = env.d1("DB")?
        .prepare("SELECT original, 'upvote' AS kind, COUNT(*) AS count, MAX(user_id = ?) AS selected FROM request_upvotes GROUP BY original UNION ALL SELECT original, 'build' AS kind, COUNT(*) AS count, MAX(user_id = ?) AS selected FROM request_builders GROUP BY original")
        .bind(&[user.clone().into(), user.into()])?
        .all().await?.results::<Row>()?;
    let snapshot = request_catalog::snapshot(config).await;
    let mut requests: Vec<Activity> = snapshot
        .lines()
        .map(|slug| Activity {
            original: slug.into(),
            ..Activity::default()
        })
        .collect();
    for row in rows {
        if let Some(item) = requests
            .iter_mut()
            .find(|item| item.original == row.original)
        {
            if row.kind == "upvote" {
                item.upvotes = row.count;
                item.upvoted = row.selected != 0;
            } else {
                item.builders = row.count;
                item.building = row.selected != 0;
            }
        }
    }
    #[derive(Serialize)]
    struct Payload {
        requests: Vec<Activity>,
    }
    Response::from_json(&Payload { requests })
}

pub async fn change(req: &Request, env: &Env, config: &Config) -> Result<Response> {
    let path = req.path();
    let Some((slug, action)) = action_path(&path) else {
        return Response::error("Request not found", 404);
    };
    let Some(user) = session::user_id(req, env, config).await? else {
        return Response::error("Unauthorized", 401);
    };
    match request_catalog::contains(slug, config).await {
        Ok(true) => {}
        Ok(false) => return Response::error("Request not found", 404),
        Err(_) => {
            return Response::error("Request catalog unavailable. Please try again later.", 503)
        }
    }
    // Statements are fixed; clients cannot supply SQL, identities or counts.
    let sql = match action {
        "upvote" => {
            "INSERT INTO request_upvotes (original, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING"
        }
        "unvote" => "DELETE FROM request_upvotes WHERE original = ? AND user_id = ?",
        "build" => {
            "INSERT INTO request_builders (original, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING"
        }
        "unbuild" => "DELETE FROM request_builders WHERE original = ? AND user_id = ?",
        _ => unreachable!(),
    };
    env.d1("DB")?
        .prepare(sql)
        .bind(&[slug.into(), user.into()])?
        .run()
        .await?;
    Response::empty().map(|response| response.with_status(204))
}
