from pathlib import Path

import pytest

from catalog import collect


@pytest.mark.parametrize(
    "source",
    [
        "[]",
        "{}",
        "projects: null",
        "projects: impl-a",
        "projects: [42]",
        'projects: [""]',
        'projects: [" impl-a"]',
        "projects: [Impl-A]",
        "projects: [impl-a, impl-a]",
        "projects: [missing]",
        "projects: [product-a]",
        "projects: []\nextra: true",
        "projects: []\nprojects: [impl-a]",
        "projects: !execute []",
    ],
)
def test_invalid_launcher_blocks_catalog(project_catalog: Path, source: str) -> None:
    (project_catalog / "launcher.yaml").write_text(source)
    assert any("launcher.yaml" in error for error in collect(project_catalog)[-1])


def test_launcher_accepts_only_existing_projects(project_catalog: Path) -> None:
    (project_catalog / "launcher.yaml").write_text("projects: [impl-a]\n")
    assert not collect(project_catalog)[-1]


def test_launcher_is_required(project_catalog: Path) -> None:
    (project_catalog / "launcher.yaml").unlink()
    assert any("launcher.yaml: missing" in error for error in collect(project_catalog)[-1])
