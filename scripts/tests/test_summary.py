from collections.abc import Callable
from pathlib import Path

import pytest
import yaml

from catalog import collect


@pytest.mark.parametrize("kind", ["project", "tool", "request"])
@pytest.mark.parametrize(
    "value, valid",
    [
        ("x", True),
        ("x" * 144, True),
        ("x" * 145, False),
        ("🎨" * 144, True),
        ("🎨" * 145, False),
        ("", False),
        ("   ", False),
        (" leading", False),
        ("trailing ", False),
        ("two\nlines", False),
        ("two\rlines", False),
        ("<b>HTML</b>", False),
        (None, False),
    ],
)
def test_card_summary(
    project_catalog: Path,
    tool_factory: Callable[[], Path],
    kind: str,
    value: str | None,
    valid: bool,
) -> None:
    base = project_catalog / "apps/frontend/remade-wiki/src/content/catalog"
    if kind == "project":
        path = base / "projects/impl-a.yaml"
    elif kind == "tool":
        path = tool_factory()
    else:
        originals = base / "originals.yaml"
        originals.write_text(
            originals.read_text()
            + "\n- slug: product-b\n  name: Product B\n  url: https://example.com/b\n  category: other\n"
        )
        path = base / "requests/product-b.yaml"
        path.write_text("original: product-b\nreason: Reproduce the application workflows.\n")

    record = yaml.safe_load(path.read_text())
    record["summary"] = value
    path.write_text(yaml.safe_dump(record, allow_unicode=True))

    assert (not collect(project_catalog)[-1]) == valid

    del record["summary"]
    path.write_text(yaml.safe_dump(record))
    assert any("missing: summary" in error for error in collect(project_catalog)[-1])
