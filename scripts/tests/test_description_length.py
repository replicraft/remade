from collections.abc import Callable
from pathlib import Path

import pytest
import yaml

from catalog import collect


@pytest.mark.parametrize("kind", ["project", "tool"])
@pytest.mark.parametrize(
    "description, valid",
    [
        ("x" * 19, False),
        ("x" * 20, True),
        ("x" * 400, True),
        ("x" * 401, True),
        ("x" * 429, True),
        ("x" * 500, True),
        ("x" * 501, False),
        (" " * 500, False),
        ("<b>" + "x" * 429 + "</b>", False),
    ],
    ids=[
        "too-short",
        "minimum",
        "old-maximum",
        "over-old-maximum",
        "pr-55-length",
        "maximum",
        "too-long",
        "blank",
        "html",
    ],
)
def test_description_validation(
    project_catalog: Path,
    tool_factory: Callable[[], Path],
    kind: str,
    description: str,
    valid: bool,
) -> None:
    path = (
        tool_factory()
        if kind == "tool"
        else project_catalog / "apps/frontend/remade-wiki/src/content/catalog/projects/impl-a.yaml"
    )
    record = yaml.safe_load(path.read_text())
    record["description"] = description
    path.write_text(yaml.safe_dump(record))

    errors = collect(project_catalog)[-1]

    assert (not errors) == valid
    if not valid:
        assert any("description must be 20–500 plain-text characters" in error for error in errors)
