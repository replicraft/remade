"""Extract explicit, validated catalog URLs for Lychee."""

import subprocess
from collections.abc import Iterator
from pathlib import Path

import typer
import yaml

from catalog import ROOT, DuplicateKeySafeLoader, is_https, load_yaml

app = typer.Typer(add_completion=False)


def url_values(path: Path) -> Iterator[str]:
    yield from urls_in_record(load_yaml(path))


def urls_in_record(obj: object) -> Iterator[str]:
    for record in obj if isinstance(obj, list) else [obj]:
        if isinstance(record, dict):
            for key in ("url", "repository", "docs", "website", "discord_server", "discord_thread"):
                value = record.get(key)
                if is_https(value):
                    yield value
            mirrors = record.get("mirrors", [])
            if isinstance(mirrors, list):
                for value in mirrors:
                    if is_https(value):
                        yield value

            screenshots = record.get("screenshots", [])
            if isinstance(screenshots, list):
                for image in screenshots:
                    if isinstance(image, dict) and is_https(image.get("src")):
                        yield image["src"]


def added_urls(paths: list[Path], revision: str) -> set[str]:
    current = {url for path in paths for url in url_values(path)}
    previous: set[str] = set()
    for path in paths:
        result = subprocess.run(
            ["git", "show", f"{revision}:{path.relative_to(ROOT).as_posix()}"],
            cwd=ROOT,
            text=True,
            check=False,
            capture_output=True,
        )
        if result.returncode == 0:
            previous.update(urls_in_record(yaml.load(result.stdout, Loader=DuplicateKeySafeLoader)))
        elif (
            subprocess.run(
                ["git", "cat-file", "-e", f"{revision}^{{commit}}"],
                cwd=ROOT,
                check=False,
                capture_output=True,
            ).returncode
            != 0
        ):
            raise typer.BadParameter("The base revision is not available")
    return current - previous


def paths_for_mode(*, all_files: bool, changed_from: str | None) -> list[Path]:
    if all_files:
        return [
            ROOT / "apps/frontend/remade-wiki/src/content/catalog/originals.yaml",
            *(ROOT / "apps/frontend/remade-wiki/src/content/catalog/projects").rglob("*.yaml"),
            *(ROOT / "apps/frontend/remade-wiki/src/content/catalog/tools").rglob("*.yaml"),
            *(ROOT / "apps/frontend/remade-wiki/src/content/catalog/requests").rglob("*.yaml"),
        ]
    if changed_from is None:
        raise typer.BadParameter("A base revision is required when not reading all files")

    result = subprocess.run(
        [
            "git",
            "diff",
            "--diff-filter=ACMR",
            "--name-only",
            changed_from,
            "HEAD",
            "--",
            "apps/frontend/remade-wiki/src/content/catalog/",
        ],
        cwd=ROOT,
        text=True,
        check=True,
        capture_output=True,
    )
    paths = []
    for name in result.stdout.splitlines():
        if name == "apps/frontend/remade-wiki/src/content/catalog/originals.yaml" or (
            name.startswith(
                (
                    "apps/frontend/remade-wiki/src/content/catalog/projects/",
                    "apps/frontend/remade-wiki/src/content/catalog/requests/",
                    "apps/frontend/remade-wiki/src/content/catalog/tools/",
                )
            )
            and name.endswith(".yaml")
        ):
            path = ROOT / name
            if path.is_file() and path.resolve().is_relative_to(ROOT):
                paths.append(path)
    return paths


@app.command()
def main(
    all_files: bool = typer.Option(False, "--all", help="Read all catalog entries"),
    changed_from: str | None = typer.Option(
        None, "--changed-from", help="Check URLs added in changed entries only"
    ),
) -> None:
    if all_files == (changed_from is not None):
        raise typer.BadParameter("Choose exactly one of --all or --changed-from")
    paths = paths_for_mode(all_files=all_files, changed_from=changed_from)
    values = (
        added_urls(paths, changed_from)
        if changed_from is not None
        else {url for path in paths for url in url_values(path)}
    )
    for url in sorted(values):
        typer.echo(url)


if __name__ == "__main__":
    app()
