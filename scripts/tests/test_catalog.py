from collections.abc import Callable
from pathlib import Path

import pytest
import yaml

from catalog import collect, collect_tools, entries_by_author


def test_empty_catalog_valid(catalog_root: Path) -> None:
    assert not collect(catalog_root)[-1]


def test_planned_project_valid(project_catalog: Path) -> None:
    project = project_catalog / "apps/frontend/remade-wiki/src/content/catalog/projects/impl-a.yaml"
    source = project.read_text()
    current_status = yaml.safe_load(source)["status"]
    source = source.replace(f"status: {current_status}", "status: planned")
    project.write_text(source.replace("compatibility: partial", "compatibility: targeting"))
    assert not collect(project_catalog)[-1]


@pytest.mark.parametrize(
    "targets, valid",
    [
        ("[product-b]", True),
        ("[]", False),
        ("product-b", False),
        ("[product-b, product-b]", False),
        ("[product-a]", True),
        ("[missing]", False),
        ("[null]", False),
        ("null", False),
        ("[product-a, product-b]", True),
    ],
)
def test_project_originals_validation(project_catalog: Path, targets: str, valid: bool) -> None:
    originals = project_catalog / "apps/frontend/remade-wiki/src/content/catalog/originals.yaml"
    originals.write_text(
        originals.read_text()
        + "\n- slug: product-b\n  name: Product B\n  url: https://example.com/product-b\n  category: other\n"
    )
    project = project_catalog / "apps/frontend/remade-wiki/src/content/catalog/projects/impl-a.yaml"
    project.write_text(
        project.read_text().replace("originals: [product-a]", f"originals: {targets}")
    )
    assert (not collect(project_catalog)[-1]) == valid


@pytest.mark.parametrize(
    "replacement",
    [
        "",
        "original: product-a",
        "originals: [product-a]\noriginal: product-a",
        "originals: [product-a]\nadditional_originals: [product-b]",
    ],
)
def test_legacy_project_target_fields_rejected(project_catalog: Path, replacement: str) -> None:
    project = project_catalog / "apps/frontend/remade-wiki/src/content/catalog/projects/impl-a.yaml"
    project.write_text(project.read_text().replace("originals: [product-a]", replacement))
    assert collect(project_catalog)[-1]


def test_additional_target_fulfills_request(project_catalog: Path) -> None:
    originals = project_catalog / "apps/frontend/remade-wiki/src/content/catalog/originals.yaml"
    originals.write_text(
        originals.read_text()
        + "\n- slug: product-b\n  name: Product B\n  url: https://example.com/product-b\n  category: other\n"
    )
    project = project_catalog / "apps/frontend/remade-wiki/src/content/catalog/projects/impl-a.yaml"
    project.write_text(
        project.read_text().replace("originals: [product-a]", "originals: [product-a, product-b]")
    )
    request = (
        project_catalog / "apps/frontend/remade-wiki/src/content/catalog/requests/product-b.yaml"
    )
    request.write_text("original: product-b\nreason: Please faithfully recreate this software.\n")
    assert any("already fulfilled" in error for error in collect(project_catalog)[-1])


@pytest.mark.parametrize(
    "mirrors, valid",
    [
        ("[https://codeberg.org/example/project]", True),
        ("[]", False),
        ("https://codeberg.org/example/project", False),
        ("[http://codeberg.org/example/project]", False),
        ("[https://github.com/example/project/issues]", False),
        ("[https://codeberg.org/example/project, https://codeberg.org/example/project.git]", False),
    ],
)
def test_project_mirrors_validation(project_catalog: Path, mirrors: str, valid: bool) -> None:
    path = project_catalog / "apps/frontend/remade-wiki/src/content/catalog/projects/impl-a.yaml"
    path.write_text(path.read_text() + f"mirrors: {mirrors}\n")
    assert (not collect(project_catalog)[-1]) == valid


@pytest.mark.parametrize(
    "website, valid",
    [
        ("https://example.org/project/", True),
        ("http://example.org/project/", False),
        ("https://localhost/project/", False),
    ],
)
def test_project_website_validation(project_catalog: Path, website: str, valid: bool) -> None:
    path = project_catalog / "apps/frontend/remade-wiki/src/content/catalog/projects/impl-a.yaml"
    path.write_text(path.read_text() + f"website: {website}\n")
    assert (not collect(project_catalog)[-1]) == valid


def test_author_folders_load_projects_tools_and_featured(
    project_catalog: Path, tool_factory: Callable[[], Path]
) -> None:
    project = project_catalog / "apps/frontend/remade-wiki/src/content/catalog/projects/impl-a.yaml"
    project.parent.joinpath("storytold").mkdir()
    project.rename(project.parent / "storytold" / project.name)
    tool = tool_factory()
    tool.parent.joinpath("daijro").mkdir()
    tool.rename(tool.parent / "daijro" / tool.name)
    (project_catalog / "apps/frontend/remade-wiki/src/content/catalog/featured.yaml").write_text(
        "- impl-a\n- example-tool\n"
    )
    _, projects, _, featured, errors = collect(project_catalog)
    assert not errors
    assert [entry["slug"] for entry in projects] == ["impl-a"]
    assert featured == ["impl-a", "example-tool"]
    assert collect_tools(project_catalog)[0][0]["slug"] == "example-tool"


def test_duplicate_projects_across_author_folders_rejected(project_catalog: Path) -> None:
    project = project_catalog / "apps/frontend/remade-wiki/src/content/catalog/projects/impl-a.yaml"
    other = project.parent / "another-user"
    other.mkdir()
    (other / project.name).write_text(project.read_text())
    errors = collect(project_catalog)[-1]
    assert any("duplicate project slug" in error for error in errors)
    assert any("duplicate repository" in error for error in errors)


@pytest.mark.parametrize(
    "value, valid",
    [
        ("[storytold, another-user]", True),
        ("[a]", True),
        ("[]", False),
        ("storytold", False),
        ("[null]", False),
        ("[StoryTold]", False),
        ("[storytold, storytold]", False),
        ('["../user"]', False),
        ('["@user"]', False),
        ("[a--b]", False),
        ('["-user"]', False),
        ('["user-"]', False),
        ('["' + "a" * 40 + '"]', False),
    ],
)
def test_project_github_authors_validation(project_catalog: Path, value: str, valid: bool) -> None:
    path = project_catalog / "apps/frontend/remade-wiki/src/content/catalog/projects/impl-a.yaml"
    content = path.read_text()
    path.write_text(
        content
        + "authors: "
        + value
        + """
"""
    )
    assert (not collect(project_catalog)[-1]) == valid


def test_tool_github_authors_validation(
    project_catalog: Path, tool_factory: Callable[[], Path]
) -> None:
    path = tool_factory()
    content = path.read_text()
    path.write_text(content + "authors: [daijro]\n")
    assert not collect(project_catalog)[-1]
    path.write_text(content + 'authors: ["https://github.com/daijro"]\n')
    assert any("authors must" in error for error in collect(project_catalog)[-1])


def test_author_grouping_uses_explicit_credit_and_all_indexed_entries() -> None:
    projects = [
        {
            "slug": "z",
            "name": "Zebra",
            "authors": ["storytold"],
            "repository": "https://github.com/other/z",
        },
        {"slug": "a", "name": "Alpha", "authors": ["storytold", "bherbruck"]},
        {
            "slug": "uncredited",
            "name": "Uncredited",
            "repository": "https://github.com/storytold/uncredited",
        },
    ]
    tools = [{"slug": "tool", "name": "Tool", "authors": ["daijro"], "projects": ["a"]}]
    groups = entries_by_author(projects, tools)
    assert list(groups) == ["bherbruck", "daijro", "storytold"]
    assert [entry["slug"] for entry in groups["storytold"]["projects"]] == ["a", "z"]
    assert groups["storytold"]["tools"] == []
    assert groups["storytold"]["url"] == "https://github.com/storytold"
    assert [entry["slug"] for entry in groups["daijro"]["tools"]] == ["tool"]
    assert entries_by_author([], []) == {}


def test_request_valid_when_no_project(original_catalog: Path) -> None:
    (
        original_catalog / "apps/frontend/remade-wiki/src/content/catalog/requests/product-a.yaml"
    ).write_text("""
original: product-a
reason: An independently authored compatible implementation would be useful.
""")
    assert not collect(original_catalog)[-1]


def test_requests_load_recursively_and_reject_duplicates_across_vendors(
    original_catalog: Path,
) -> None:
    directory = original_catalog / "apps/frontend/remade-wiki/src/content/catalog/requests/vendor"
    directory.mkdir()
    path = directory / "product-a.yaml"
    path.write_text("original: product-a\nreason: Reproduce the original application workflows.\n")
    _, _, requests, _, errors = collect(original_catalog)
    assert not errors
    assert [request["original"] for request in requests] == ["product-a"]
    other = directory.parent / "another-vendor"
    other.mkdir()
    (other / path.name).write_text(path.read_text())
    assert any("duplicate request" in error for error in collect(original_catalog)[-1])


def test_nested_request_is_rejected_when_fulfilled(project_catalog: Path) -> None:
    directory = project_catalog / "apps/frontend/remade-wiki/src/content/catalog/requests/vendor"
    directory.mkdir()
    (directory / "product-a.yaml").write_text(
        "original: product-a\nreason: Reproduce the original application workflows.\n"
    )
    assert any("already fulfilled" in error for error in collect(project_catalog)[-1])


@pytest.mark.parametrize(
    "names, valid",
    [
        ("[MusicCraft, SoundCraft]", True),
        ("[]", False),
        ("MusicCraft", False),
        ("[null]", False),
        ('["<b>name</b>"]', False),
        ('["MusicCraft", " musiccraft "]', False),
        ('["A"]', False),
        ('["' + "a" * 101 + '"]', False),
    ],
)
def test_request_suggested_names_validation(
    original_catalog: Path, names: str, valid: bool
) -> None:
    path = (
        original_catalog / "apps/frontend/remade-wiki/src/content/catalog/requests/product-a.yaml"
    )
    path.write_text(
        "original: product-a\nreason: A faithful implementation would be useful.\nsuggested_names: "
        + names
        + """
"""
    )
    assert (not collect(original_catalog)[-1]) == valid


def test_tool_can_be_featured_without_counting_as_project(
    project_catalog: Path, tool_factory: Callable[[], Path]
) -> None:
    tool_factory()
    (project_catalog / "apps/frontend/remade-wiki/src/content/catalog/featured.yaml").write_text(
        "- example-tool\n"
    )
    _, projects, _, featured, errors = collect(project_catalog)
    assert not errors
    assert [project["slug"] for project in projects] == ["impl-a"]
    assert featured == ["example-tool"]
    tools, errors = collect_tools(project_catalog)
    assert not errors
    assert tools[0]["slug"] == "example-tool"


@pytest.mark.parametrize(
    "platforms, valid",
    [
        ("[Web]", True),
        ("[Linux, macOS, Windows]", True),
        ("[]", True),
        ("Web", False),
        ("null", False),
        ("[null]", False),
        ('["<b>Web</b>"]', False),
        ('["' + "a" * 41 + '"]', False),
    ],
)
def test_tool_platforms_validation(
    catalog_root: Path, platforms: str, valid: bool, tool_factory: Callable[[], Path]
) -> None:
    path = tool_factory()
    path.write_text(
        path.read_text()
        + "platforms: "
        + platforms
        + """
"""
    )
    tools, errors = collect_tools(catalog_root)
    assert (not errors) == valid
    if valid:
        assert "platforms" in tools[0]


def test_tool_requires_existing_project(
    catalog_root: Path, tool_factory: Callable[[], Path]
) -> None:
    tool_factory()
    assert any("unknown project impl-a" in error for error in collect(catalog_root)[-1])


@pytest.mark.parametrize(
    "old, new",
    [
        ("projects: [impl-a]", "projects: []"),
        ("projects: [impl-a]", "projects: [impl-a, impl-a]"),
        ("projects: [impl-a]", "projects: [null]"),
        ("url: https://example.org/tool", "url: https://127.0.0.1/tool"),
        (
            "https://github.com/example/example-tool",
            "https://github.com/example/example-tool/issues",
        ),
        ("slug: example-tool", "slug: different-slug"),
        ("name: Example Tool", 'name: "<b>Tool</b>"'),
        ("name: Example Tool", "name: Example Tool\nextra: unexpected"),
    ],
)
def test_tool_rejects_invalid_input(
    project_catalog: Path, old: str, new: str, tool_factory: Callable[[], Path]
) -> None:
    path = tool_factory()
    path.write_text(path.read_text().replace(old, new))
    assert collect(project_catalog)[-1]


def test_tools_share_project_slug_and_repository_namespace(
    project_catalog: Path, tool_factory: Callable[[], Path]
) -> None:
    path = tool_factory()
    path.write_text(
        path.read_text().replace(
            "https://github.com/example/example-tool", "https://github.com/EXAMPLE/IMPL-A"
        )
    )
    assert any("repository already used" in error for error in collect(project_catalog)[-1])
    path = tool_factory()
    path.write_text(path.read_text().replace("slug: example-tool", "slug: impl-a"))
    path.rename(path.with_name("impl-a.yaml"))
    assert any("slug already used" in error for error in collect(project_catalog)[-1])


def test_duplicate_tool_repositories_rejected(
    project_catalog: Path, tool_factory: Callable[[], Path]
) -> None:
    path = tool_factory()
    path.with_name("another-tool.yaml").write_text(
        path.read_text().replace("slug: example-tool", "slug: another-tool")
    )
    assert any("duplicate repository" in error for error in collect(project_catalog)[-1])


def test_request_cannot_coexist_with_project(project_catalog: Path) -> None:
    (
        project_catalog / "apps/frontend/remade-wiki/src/content/catalog/requests/product-a.yaml"
    ).write_text("""
original: product-a
reason: An independently authored compatible implementation would be useful.
""")
    assert any("already fulfilled" in x for x in collect(project_catalog)[-1])


def test_project_and_featured_valid(project_catalog: Path) -> None:
    (project_catalog / "apps/frontend/remade-wiki/src/content/catalog/featured.yaml").write_text(
        "- impl-a\n"
    )
    assert not collect(project_catalog)[-1]


def test_disallow_untrusted_private_url(original_catalog: Path) -> None:
    (original_catalog / "apps/frontend/remade-wiki/src/content/catalog/originals.yaml").write_text(
        (original_catalog / "apps/frontend/remade-wiki/src/content/catalog/originals.yaml")
        .read_text()
        .replace("https://example.com/product-a", "https://127.0.0.1/api")
    )
    assert any("public HTTPS" in x for x in collect(original_catalog)[-1])


def test_duplicate_yaml_keys_rejected(original_catalog: Path) -> None:
    (
        original_catalog / "apps/frontend/remade-wiki/src/content/catalog/requests/product-a.yaml"
    ).write_text("""
original: product-a
original: product-b
reason: An independent compatible implementation would be useful.
""")
    assert any("Duplicate YAML key" in x for x in collect(original_catalog)[-1])


@pytest.mark.parametrize(
    "license_value, valid",
    [("MIT", True), ('""', False), ("null", False), ("42", False), ('"<b>MIT</b>"', False)],
)
def test_tool_license(
    project_catalog: Path, tool_factory: Callable[[], Path], license_value: str, valid: bool
) -> None:
    path = tool_factory()
    path.write_text(path.read_text() + f"\nlicense: {license_value}\n")
    tools, errors = collect_tools(project_catalog)
    assert (not errors) == valid
    if valid:
        assert tools[0]["license"] == "MIT"


@pytest.mark.parametrize(
    "field, value, valid",
    [
        ("languages", "[JavaScript]", True),
        ("languages", "[]", False),
        ("languages", "[null]", False),
        ("status", "beta", True),
        ("status", "unknown", False),
        ("docs", "https://example.org/docs", True),
        ("docs", "http://example.org", False),
        ("website", "https://example.org", True),
        ("website", "https://localhost/", False),
        ("limitations", "Some host APIs are not supported.", True),
        ("limitations", "null", False),
        ("limitations", '"<b>bad</b>"', False),
    ],
)
def test_tool_details(
    project_catalog: Path, tool_factory: Callable[[], Path], field: str, value: str, valid: bool
) -> None:
    path = tool_factory()
    source = path.read_text()
    if field == "languages":
        source = source.replace("languages: [JavaScript]", f"languages: {value}")
    else:
        source += f"\n{field}: {value}\n"
    path.write_text(source)
    tools, errors = collect_tools(project_catalog)
    assert (not errors) == valid
    if valid:
        assert field in tools[0]


def test_tool_requires_languages(project_catalog: Path, tool_factory: Callable[[], Path]) -> None:
    path = tool_factory()
    path.write_text(path.read_text().replace("languages: [JavaScript]\n", ""))
    assert collect_tools(project_catalog)[1]


@pytest.mark.parametrize(
    "value, valid",
    [
        ("[https://codeberg.org/example/tool]", True),
        ("[]", False),
        ("https://codeberg.org/example/tool", False),
        ("[http://example.org/tool]", False),
        ("[https://github.com/example/tool/issues]", False),
        ("[https://codeberg.org/example/tool, https://codeberg.org/example/tool.git]", False),
    ],
)
def test_tool_mirrors(
    project_catalog: Path, tool_factory: Callable[[], Path], value: str, valid: bool
) -> None:
    path = tool_factory()
    path.write_text(path.read_text() + f"\nmirrors: {value}\n")
    tools, errors = collect_tools(project_catalog)
    assert (not errors) == valid
    if valid:
        assert tools[0]["mirrors"] == ["https://codeberg.org/example/tool"]
