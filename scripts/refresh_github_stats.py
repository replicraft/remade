"""Daily best-effort batch refresh of cached repository metadata with GraphQL."""

import datetime as dt
import json
import os
import re
import subprocess
import time
from collections.abc import Iterator
from typing import Any

import requests
import typer
import yaml
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from catalog import GH_REPO, ROOT, DuplicateKeySafeLoader, collect, collect_tools

app = typer.Typer(add_completion=False)
API = "https://api.github.com/graphql"
CACHE = ROOT / "cache/github-metadata.json"


class LanguageInfo(BaseModel):
    model_config = ConfigDict(strict=True)

    name: str


class LicenseInfo(BaseModel):
    model_config = ConfigDict(strict=True)

    spdx_id: str | None = Field(alias="spdxId")


class RepositoryMetadata(BaseModel):
    """Validate API records before replacing a previously successful cache entry."""

    model_config = ConfigDict(strict=True)

    stars: int = Field(alias="stargazerCount", ge=0)
    forks: int = Field(alias="forkCount", ge=0)
    is_archived: bool = Field(alias="isArchived")
    pushed_at: str | None = Field(default=None, alias="pushedAt")
    primary_language: LanguageInfo | None = Field(default=None, alias="primaryLanguage")
    license_info: LicenseInfo | None = Field(default=None, alias="licenseInfo")


def repositories_at_revision(revision: str) -> set[str]:
    """Read repository identities from a previous catalog without making API calls."""
    if not re.fullmatch(r"[0-9a-fA-F]{40}|[0-9a-fA-F]{64}", revision):
        raise typer.BadParameter("The base revision must be a full Git commit SHA")
    if set(revision) == {"0"}:
        return set()
    result = subprocess.run(
        [
            "git",
            "ls-tree",
            "-r",
            "-z",
            "--name-only",
            revision,
            "--",
            "apps/frontend/remade-wiki/src/content/catalog/projects/",
            "apps/frontend/remade-wiki/src/content/catalog/tools/",
            # Read pre-migration commits too, so moves don't trigger a full refresh.
            "src/content/catalog/projects/",
            "src/content/catalog/tools/",
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=True,
    )
    repositories = set()
    for path in result.stdout.split("\0"):
        if not path.endswith(".yaml"):
            continue
        content = subprocess.run(
            ["git", "show", f"{revision}:{path}"],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=True,
        )
        record = yaml.load(content.stdout, Loader=DuplicateKeySafeLoader)
        if isinstance(record, dict) and isinstance(record.get("repository"), str):
            if match := GH_REPO.fullmatch(record["repository"]):
                repositories.add(f"{match.group(1)}/{match.group(2)}".casefold())
    return repositories


def batches[T](items: list[T], size: int) -> Iterator[list[T]]:
    for index in range(0, len(items), size):
        yield items[index : index + size]


def graphql_query(names: list[tuple[str, str]]) -> str:
    fields = [
        f"p{i}: repository(owner: {json.dumps(owner)}, name: {json.dumps(repo)}) {{ "
        "stargazerCount forkCount pushedAt isArchived "
        "primaryLanguage { name } licenseInfo { spdxId } }"
        for i, (owner, repo) in enumerate(names)
    ]
    return "query RemadeMetadata { " + " ".join(fields) + " rateLimit { cost remaining resetAt } }"


def call_graphql(token: str, query: str) -> dict[str, Any]:
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "remade-wiki-metadata/1.0",
    }
    for attempt in range(3):
        try:
            response = requests.post(API, json={"query": query}, headers=headers, timeout=25)
            response.raise_for_status()
            return response.json()
        except (requests.RequestException, ValueError) as exc:
            status = (
                exc.response.status_code
                if isinstance(exc, requests.HTTPError) and exc.response is not None
                else None
            )
            if attempt == 2 or (status is not None and status not in {429, 500, 502, 503, 504}):
                raise
            time.sleep(2**attempt)
    raise RuntimeError("GraphQL requests exhausted")


@app.command()
def main(
    batch_size: int = typer.Option(25, min=1, max=50),
    added_since: str | None = typer.Option(
        None, help="Only query GitHub repositories absent from this commit"
    ),
    list_only: bool = typer.Option(
        False, help="Print selected repository identities without querying GitHub"
    ),
) -> None:
    _, projects, _, _, errors = collect()
    if errors:
        for error in errors:
            typer.echo(error, err=True)
        raise typer.Exit(code=1)

    repositories: dict[str, tuple[str, str]] = {}
    tools, _ = collect_tools()
    for project in [*projects, *tools]:
        if match := GH_REPO.fullmatch(project["repository"]):
            key = f"{match.group(1)}/{match.group(2)}".casefold()
            repositories[key] = match.group(1), match.group(2)

    if added_since is None:
        repositories["replicraft/remade"] = "replicraft", "remade"
    else:
        previous_repositories = repositories_at_revision(added_since)
        repositories = {
            key: value for key, value in repositories.items() if key not in previous_repositories
        }
    if list_only:
        for key in sorted(repositories):
            typer.echo(key)
        return
    if not repositories:
        typer.echo("No GitHub repositories to refresh")
        return
    token = os.getenv("GH_METADATA_APP_TOKEN")
    if not token:
        typer.echo("Missing GH_METADATA_APP_TOKEN", err=True)
        raise typer.Exit(code=1)

    current = (
        json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {"repositories": {}}
    )
    previous: dict[str, dict] = current.get("repositories", {})
    now = dt.datetime.now(dt.UTC).isoformat(timespec="seconds").replace("+00:00", "Z")
    succeeded = 0
    failed = 0
    for chunk in batches(sorted(repositories.items()), batch_size):
        keys = [key for key, _ in chunk]
        names = [name for _, name in chunk]
        try:
            result = call_graphql(token, graphql_query(names))
        except (requests.RequestException, ValueError) as exc:
            typer.echo(f"WARN: batch failed ({len(keys)} entries): {exc}", err=True)
            failed += len(keys)
            continue
        data = result.get("data") or {}
        for i, key in enumerate(keys):
            item = data.get(f"p{i}")
            if not isinstance(item, dict):
                failed += 1
                continue
            try:
                metadata = RepositoryMetadata.model_validate(item)
            except ValidationError:
                typer.echo(
                    f"WARN: invalid GitHub metadata for {key}; cached record preserved", err=True
                )
                failed += 1
                continue

            previous[key] = {
                "stars": metadata.stars,
                "forks": metadata.forks,
                "primaryLanguage": metadata.primary_language.name
                if metadata.primary_language
                else None,
                "pushedAt": metadata.pushed_at,
                "isArchived": metadata.is_archived,
                "licenseSpdx": metadata.license_info.spdx_id if metadata.license_info else None,
                "fetchedAt": now,
            }
            succeeded += 1
        rate = data.get("rateLimit") or {}
        typer.echo(
            f"GitHub batch {len(keys)} entries; cost={rate.get('cost', '?')}; remaining={rate.get('remaining', '?')}"
        )
        if result.get("errors"):
            typer.echo(f"WARN: partial GraphQL errors: {len(result['errors'])}", err=True)
        if rate.get("remaining") is not None and rate["remaining"] < 20:
            typer.echo("WARN: API rate budget low; cached records preserved", err=True)
            break

    CACHE.parent.mkdir(exist_ok=True, parents=True)
    rendered = (
        json.dumps({"repositories": previous}, indent=2, sort_keys=True, ensure_ascii=False) + "\n"
    )
    if not CACHE.exists() or CACHE.read_text(encoding="utf-8") != rendered:
        CACHE.write_text(rendered, encoding="utf-8")
    typer.echo(f"Updated {succeeded}; unavailable {failed}; cached {len(previous)}")
    if repositories and succeeded == 0:
        raise typer.Exit(code=1)


if __name__ == "__main__":
    app()
