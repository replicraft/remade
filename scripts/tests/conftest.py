from collections.abc import Callable
from pathlib import Path

import pytest


@pytest.fixture
def catalog_root(tmp_path: Path) -> Path:
    (tmp_path / "launcher.yaml").write_text("projects: []\n")
    for folder in ("projects", "requests"):
        (tmp_path / "apps/frontend/remade-wiki/src/content/catalog" / folder).mkdir(parents=True)
    (tmp_path / "apps/frontend/remade-wiki/src/content/catalog/originals.yaml").write_text("[]\n")
    (tmp_path / "apps/frontend/remade-wiki/src/content/catalog/featured.yaml").write_text("[]\n")
    return tmp_path


@pytest.fixture
def original_catalog(catalog_root: Path) -> Path:
    (catalog_root / "apps/frontend/remade-wiki/src/content/catalog/originals.yaml").write_text("""
- slug: product-a
  name: Product A
  url: https://example.com/product-a
  category: other
""")
    return catalog_root


@pytest.fixture
def project_catalog(original_catalog: Path) -> Path:
    (
        original_catalog / "apps/frontend/remade-wiki/src/content/catalog/projects/impl-a.yaml"
    ).write_text("""
slug: impl-a
name: Implementation A
repository: https://github.com/example/impl-a
originals: [product-a]
category: other
languages: [Rust]
status: experimental
compatibility: targeting
description: An independent implementation of a public software interface.
license: MIT
""")
    return original_catalog


def write_tool(catalog_root: Path) -> Path:
    directory = catalog_root / "apps/frontend/remade-wiki/src/content/catalog/tools"
    directory.mkdir(exist_ok=True)
    path = directory / "example-tool.yaml"
    path.write_text("""
slug: example-tool
name: Example Tool
languages: [JavaScript]
repository: https://github.com/example/example-tool
url: https://example.org/tool
description: A browser launcher for the indexed implementation.
projects: [impl-a]
""")
    return path


@pytest.fixture
def tool_factory(catalog_root: Path) -> Callable[[], Path]:
    return lambda: write_tool(catalog_root)
