from pathlib import Path

import pytest
import yaml

from catalog import collect, validate_discord
from catalog_links import urls_in_record

LINKS = {
    "discord_server": "https://discord.gg/example",
    "discord_thread": "https://discord.com/channels/123/456/789",
}


@pytest.mark.parametrize(
    "record",
    [
        {},
        LINKS,
        {"discord_server": "https://solidcraft.io/discord"},
        {"discord_server": "https://solidcraft.io/discord/"},
        {"discord_server": "https://discord.com/invite/example/"},
        {"discord_thread": "https://discord.com/channels/123/456/"},
    ],
)
def test_valid_discord_links(record: dict) -> None:
    errors: list[str] = []
    validate_discord(record, "record", errors)
    assert not errors


@pytest.mark.parametrize(
    "field,value",
    [
        ("discord_server", "http://solidcraft.io/discord"),
        ("discord_server", "https://solidcraft.io/discord?redirect=evil"),
        ("discord_server", "https://solidcraft.io/discord#fragment"),
        ("discord_server", "https://user@solidcraft.io/discord"),
        ("discord_server", "https://solidcraft.io/community"),
        ("discord_server", "http://discord.gg/example"),
        ("discord_server", "https://discord.gg.evil.com/example"),
        ("discord_server", "https://discord.gg/example?redirect=evil"),
        ("discord_thread", "https://discord.com/invite/example"),
        ("discord_thread", "https://discord.com/channels/@me/123"),
        ("discord_thread", "https://discord.com/channels/123/456#fragment"),
        ("discord_thread", "https://user@discord.com/channels/123/456"),
        ("discord_thread", "https://discord.com:443/channels/123/456"),
        ("discord_thread", "https://discord.com/channels/123/456\n"),
        ("discord_server", None),
        ("discord_thread", []),
    ],
)
def test_invalid_discord_links(field: str, value: object) -> None:
    errors: list[str] = []
    validate_discord({field: value}, "record", errors)
    assert errors


def test_links_allowed_in_project_and_request_records(
    project_catalog: Path, original_catalog: Path
) -> None:
    path = project_catalog / "apps/frontend/remade-wiki/src/content/catalog/projects/impl-a.yaml"
    project = yaml.safe_load(path.read_text())
    path.write_text(yaml.safe_dump({**project, **LINKS}))
    assert not collect(project_catalog)[-1]
    path.unlink()
    request = (
        original_catalog / "apps/frontend/remade-wiki/src/content/catalog/requests/product-a.yaml"
    )
    request.write_text(
        yaml.safe_dump(
            {
                "original": "product-a",
                "summary": "Wanted: compatible application workflows.",
                "reason": "A faithful implementation of the original software is wanted.",
                **LINKS,
            }
        )
    )
    assert not collect(original_catalog)[-1]
    assert set(urls_in_record(LINKS)) == set(LINKS.values())
