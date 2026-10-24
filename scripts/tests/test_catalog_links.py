from pathlib import Path
from unittest.mock import Mock

import pytest

from catalog_links import added_urls, paths_for_mode, url_values


def test_only_new_urls_in_modified_originals_are_checked(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    path = tmp_path / "originals.yaml"
    path.write_text("- url: https://example.org/existing\n- url: https://example.org/new\n")
    monkeypatch.setattr("catalog_links.ROOT", tmp_path)
    monkeypatch.setattr(
        "catalog_links.subprocess.run",
        Mock(return_value=Mock(returncode=0, stdout="- url: https://example.org/existing\n")),
    )

    assert added_urls([path], "base") == {"https://example.org/new"}


def test_replaced_urls_and_added_mirrors_are_checked(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    path = tmp_path / "project.yaml"
    path.write_text(
        "repository: https://github.com/example/new\n"
        "mirrors: [https://codeberg.org/example/project]\n"
    )
    monkeypatch.setattr("catalog_links.ROOT", tmp_path)
    monkeypatch.setattr(
        "catalog_links.subprocess.run",
        Mock(
            return_value=Mock(returncode=0, stdout="repository: https://github.com/example/old\n")
        ),
    )

    assert added_urls([path], "base") == {
        "https://github.com/example/new",
        "https://codeberg.org/example/project",
    }


def test_new_files_check_all_their_urls(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    path = tmp_path / "project.yaml"
    path.write_text("repository: https://github.com/example/new\n")
    monkeypatch.setattr("catalog_links.ROOT", tmp_path)
    monkeypatch.setattr(
        "catalog_links.subprocess.run",
        Mock(side_effect=[Mock(returncode=128), Mock(returncode=0)]),
    )

    assert added_urls([path], "base") == {"https://github.com/example/new"}


def test_mirror_repository_links_are_checked(tmp_path: Path) -> None:
    path = tmp_path / "project.yaml"
    path.write_text(
        "mirrors: [https://codeberg.org/example/project, https://gitlab.com/example/project]\n"
    )
    assert set(url_values(path)) == {
        "https://codeberg.org/example/project",
        "https://gitlab.com/example/project",
    }


def test_official_website_is_checked(tmp_path: Path) -> None:
    path = tmp_path / "project.yaml"
    path.write_text("website: https://example.org/project/\n")
    assert list(url_values(path)) == ["https://example.org/project/"]


def test_tools_included_in_full_and_changed_catalog_checks(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    directory = tmp_path / "apps/frontend/remade-wiki/src/content/catalog/tools/daijro"
    directory.mkdir(parents=True)
    path = directory / "launcher.yaml"
    path.write_text(
        "repository: https://github.com/example/launcher\nurl: https://example.org/launcher\n"
    )
    monkeypatch.setattr("catalog_links.ROOT", tmp_path)
    assert path in paths_for_mode(all_files=True, changed_from=None)
    run = Mock(
        return_value=Mock(
            stdout="apps/frontend/remade-wiki/src/content/catalog/tools/daijro/launcher.yaml\n"
        )
    )
    monkeypatch.setattr("catalog_links.subprocess.run", run)
    assert paths_for_mode(all_files=False, changed_from="base") == [path]
    assert set(url_values(path)) == {
        "https://github.com/example/launcher",
        "https://example.org/launcher",
    }


def test_vendor_request_files_are_discovered_in_both_modes(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    path = tmp_path / "apps/frontend/remade-wiki/src/content/catalog/requests/adobe/product.yaml"
    path.parent.mkdir(parents=True)
    path.write_text(
        "original: product\nsummary: Requested compatible workflows.\nreason: Reproduce the original workflows.\n"
    )
    monkeypatch.setattr("catalog_links.ROOT", tmp_path)
    assert path in paths_for_mode(all_files=True, changed_from=None)
    run = Mock(
        return_value=Mock(
            stdout="apps/frontend/remade-wiki/src/content/catalog/requests/adobe/product.yaml\n"
        )
    )
    monkeypatch.setattr("catalog_links.subprocess.run", run)
    assert paths_for_mode(all_files=False, changed_from="base") == [path]
