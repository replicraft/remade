import json
from pathlib import Path
from unittest.mock import Mock

import pytest
from typer.testing import CliRunner

import refresh_github_stats as stats


@pytest.fixture
def metadata_catalog(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        stats,
        "collect",
        lambda: (
            [],
            [
                {"repository": "https://github.com/example/existing"},
                {"repository": "https://github.com/example/new"},
                {"repository": "https://codeberg.org/example/other"},
            ],
            [],
            [],
            [],
        ),
    )
    monkeypatch.setattr(
        stats,
        "collect_tools",
        lambda: (
            [{"repository": "https://github.com/example/tool"}],
            [],
        ),
    )
    monkeypatch.setattr(
        stats,
        "repositories_at_revision",
        lambda revision: {
            "example/existing",
            "example/tool",
        },
    )


def test_push_queries_only_new_repository_and_preserves_cache(
    metadata_catalog: None,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    cache = tmp_path / "github-metadata.json"
    previous = {"stars": 123, "fetchedAt": "2026-01-01T00:00:00Z"}
    cache.write_text(json.dumps({"repositories": {"example/existing": previous}}))
    monkeypatch.setattr(stats, "CACHE", cache)
    monkeypatch.setenv("GH_METADATA_APP_TOKEN", "test-token")
    api = Mock(
        return_value={
            "data": {
                "p0": {
                    "stargazerCount": 5,
                    "forkCount": 2,
                    "isArchived": False,
                }
            }
        }
    )
    monkeypatch.setattr(stats, "call_graphql", api)

    result = CliRunner().invoke(stats.app, ["--added-since", "a" * 40])

    assert result.exit_code == 0, result.output
    api.assert_called_once()
    assert api.call_args.args[1] == stats.graphql_query([("example", "new")])
    records = json.loads(cache.read_text())["repositories"]
    assert records["example/existing"] == previous
    assert records["example/new"]["stars"] == 5


def test_selection_does_not_need_token_or_query_api(
    metadata_catalog: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("GH_METADATA_APP_TOKEN", raising=False)
    api = Mock()
    monkeypatch.setattr(stats, "call_graphql", api)
    result = CliRunner().invoke(stats.app, ["--added-since", "a" * 40, "--list-only"])
    assert result.exit_code == 0, result.output
    assert result.output.splitlines() == ["example/new"]
    api.assert_not_called()


def test_full_refresh_selection_includes_existing_projects_and_tools(
    metadata_catalog: None,
) -> None:
    result = CliRunner().invoke(stats.app, ["--list-only"])
    assert result.exit_code == 0, result.output
    assert result.output.splitlines() == [
        "example/existing",
        "example/new",
        "example/tool",
        "replicraft/remade",
    ]


def test_no_new_repositories_leaves_cache_untouched(
    metadata_catalog: None,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    cache = tmp_path / "github-metadata.json"
    cache.write_text('{"repositories": {}}\n')
    monkeypatch.setattr(stats, "CACHE", cache)
    monkeypatch.setattr(
        stats,
        "repositories_at_revision",
        lambda revision: {
            "example/existing",
            "example/new",
            "example/tool",
        },
    )
    monkeypatch.delenv("GH_METADATA_APP_TOKEN", raising=False)
    api = Mock()
    monkeypatch.setattr(stats, "call_graphql", api)
    result = CliRunner().invoke(stats.app, ["--added-since", "a" * 40])
    assert result.exit_code == 0, result.output
    assert cache.read_text() == '{"repositories": {}}\n'
    api.assert_not_called()


@pytest.mark.parametrize("prefix", ["src", "apps/frontend/remade-wiki/src"])
def test_previous_catalog_reads_only_project_and_tool_repositories(
    prefix: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    run = Mock(
        side_effect=[
            Mock(
                stdout=f"{prefix}/content/catalog/projects/owner/old.yaml\0{prefix}/content/catalog/tools/tool.yaml\0README.md\0"
            ),
            Mock(stdout="repository: https://github.com/Example/Existing\n"),
            Mock(stdout="repository: https://codeberg.org/example/tool\n"),
        ]
    )
    monkeypatch.setattr(stats.subprocess, "run", run)
    assert stats.repositories_at_revision("a" * 40) == {"example/existing"}
    assert run.call_args_list[0].args[0][-4:] == [
        "apps/frontend/remade-wiki/src/content/catalog/projects/",
        "apps/frontend/remade-wiki/src/content/catalog/tools/",
        "src/content/catalog/projects/",
        "src/content/catalog/tools/",
    ]


def test_initial_push_has_no_previous_repositories(monkeypatch: pytest.MonkeyPatch) -> None:
    run = Mock()
    monkeypatch.setattr(stats.subprocess, "run", run)
    assert stats.repositories_at_revision("0" * 40) == set()
    run.assert_not_called()


@pytest.mark.parametrize("revision", ["--all", "main", "a" * 39])
def test_previous_catalog_rejects_invalid_revision(revision: str) -> None:
    with pytest.raises(stats.typer.BadParameter):
        stats.repositories_at_revision(revision)


@pytest.mark.parametrize(
    "invalid",
    [
        {},
        {"stargazerCount": "5", "forkCount": 2, "isArchived": False},
        {"stargazerCount": True, "forkCount": 2, "isArchived": False},
        {"stargazerCount": -1, "forkCount": 2, "isArchived": False},
        {"stargazerCount": 5, "forkCount": -1, "isArchived": False},
        {"stargazerCount": 5, "forkCount": 2, "isArchived": "false"},
        {"stargazerCount": 5, "forkCount": 2, "isArchived": False, "primaryLanguage": {"name": 1}},
        {"stargazerCount": 5, "forkCount": 2, "isArchived": False, "licenseInfo": {"spdxId": []}},
    ],
)
def test_invalid_api_record_preserves_cache_and_other_repositories_refresh(
    invalid: dict[str, object],
    metadata_catalog: None,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    cache = tmp_path / "github-metadata.json"
    previous = {"stars": 123, "fetchedAt": "2026-01-01T00:00:00Z"}
    cache.write_text(json.dumps({"repositories": {"example/new": previous}}))
    monkeypatch.setattr(stats, "CACHE", cache)
    monkeypatch.setenv("GH_METADATA_APP_TOKEN", "test-token")
    monkeypatch.setattr(
        stats,
        "call_graphql",
        Mock(
            return_value={
                "data": {
                    "p0": {"stargazerCount": 5, "forkCount": 2, "isArchived": False},
                    "p1": invalid,
                }
            }
        ),
    )

    result = CliRunner().invoke(stats.app, [])

    assert result.exit_code == 0, result.output
    assert "invalid GitHub metadata for example/new" in result.output
    records = json.loads(cache.read_text())["repositories"]
    assert records["example/new"] == previous
    assert records["example/existing"]["stars"] == 5


def test_api_metadata_preserves_nullable_fields_and_maps_nested_values() -> None:
    metadata = stats.RepositoryMetadata.model_validate(
        {
            "stargazerCount": 0,
            "forkCount": 0,
            "isArchived": True,
            "pushedAt": None,
            "primaryLanguage": {"name": "Rust"},
            "licenseInfo": {"spdxId": "MIT"},
        }
    )

    assert metadata.stars == 0
    assert metadata.pushed_at is None
    assert metadata.primary_language is not None
    assert metadata.primary_language.name == "Rust"
    assert metadata.license_info is not None
    assert metadata.license_info.spdx_id == "MIT"


def test_api_license_can_have_no_spdx_identifier() -> None:
    metadata = stats.RepositoryMetadata.model_validate(
        {
            "stargazerCount": 0,
            "forkCount": 0,
            "isArchived": False,
            "licenseInfo": {"spdxId": None},
        }
    )

    assert metadata.license_info is not None
    assert metadata.license_info.spdx_id is None
