"""Remade's Git-native catalog validation and ingestion helpers.

Third-party catalog text is untrusted. Never execute anything from listed repositories.
"""

import ipaddress
import re
from pathlib import Path
from urllib.parse import urlsplit

import validators
import yaml

ROOT = Path(__file__).resolve().parents[1]
CATEGORIES = {
    "creative",
    "productivity",
    "engineering",
    "operating-systems",
    "games",
    "developer-tools",
    "protocols",
    "other",
}
STATUSES = {"planned", "experimental", "alpha", "beta", "stable", "archived"}
COMPATIBILITY = {"targeting", "partial", "high", "claimed-complete"}
SLUG = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*\Z")
GH_REPO = re.compile(r"https://github\.com/([A-Za-z0-9-]+)/([A-Za-z0-9_.-]+)\Z")
AUTHOR_SLUG = re.compile(r"[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,38}\Z")


class DuplicateKeySafeLoader(yaml.SafeLoader):
    pass


def no_duplicate_keys(loader, node):
    result = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=True)
        if key in result:
            raise ValueError(f"Duplicate YAML key: {key}")
        result[key] = loader.construct_object(value_node, deep=True)
    return result


DuplicateKeySafeLoader.add_constructor(
    yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, no_duplicate_keys
)


def load_yaml(path: Path):
    return yaml.load(path.read_text(encoding="utf-8"), Loader=DuplicateKeySafeLoader)


def is_slug(v):
    return isinstance(v, str) and bool(SLUG.fullmatch(v))


def is_text(v, minlen=1, maxlen=400):
    return (
        isinstance(v, str) and minlen <= len(v.strip()) <= maxlen and "<" not in v and ">" not in v
    )


def is_https(v):
    if not isinstance(v, str) or validators.url(v) is not True:
        return False
    try:
        parts = urlsplit(v)
        host = parts.hostname
        if (
            parts.scheme != "https"
            or not host
            or parts.username
            or parts.password
            or parts.port is not None
            or any(ch.isspace() for ch in v)
        ):
            return False
        if host.lower() == "localhost" or host.lower().endswith(
            (".local", ".internal", ".localhost", ".test")
        ):
            return False
        try:
            ipaddress.ip_address(host)
            return False
        except ValueError:
            pass
        return "." in host
    except ValueError:
        return False


def fields(obj, required, optional, location, errors):
    if not isinstance(obj, dict):
        errors.append(f"{location}: expected a YAML mapping")
        return False
    missing = set(required) - obj.keys()
    extra = obj.keys() - (set(required) | set(optional))
    if missing:
        errors.append(f"{location}: missing: {', '.join(sorted(missing))}")
    if extra:
        errors.append(f"{location}: unknown: {', '.join(sorted(extra))}")
    return not missing and not extra


def checked_load(path, errors):
    try:
        return load_yaml(path)
    except (ValueError, yaml.YAMLError, UnicodeError) as e:
        errors.append(f"{path}: malformed YAML: {e}")
        return None


def collect(root=ROOT):
    errors = []
    originals_file = root / "apps/frontend/remade-wiki/src/content/catalog/originals.yaml"
    featured_file = root / "apps/frontend/remade-wiki/src/content/catalog/featured.yaml"
    originals = checked_load(originals_file, errors)
    featured = checked_load(featured_file, errors)
    originals = originals if isinstance(originals, list) else []
    featured = featured if isinstance(featured, list) else []
    original_by_slug = {}
    names = set()
    for i, original in enumerate(originals):
        loc = f"apps/frontend/remade-wiki/src/content/catalog/originals.yaml entry #{i + 1}"
        if not fields(original, {"slug", "name", "url", "category"}, {"aliases"}, loc, errors):
            continue
        slug = original["slug"]
        if not is_slug(slug):
            errors.append(f"{loc}: invalid slug")
        elif slug in original_by_slug:
            errors.append(f"{loc}: duplicate slug: {slug}")
        else:
            original_by_slug[slug] = original
        if not is_text(original["name"], 2, 100):
            errors.append(f"{loc}: invalid name")
        if not is_https(original["url"]):
            errors.append(f"{loc}: url must be a public HTTPS URL")
        if not isinstance(original["category"], str) or original["category"] not in CATEGORIES:
            errors.append(f"{loc}: invalid category")
        aliases = original.get("aliases", [])
        if not isinstance(aliases, list) or any(not is_text(x, 2, 100) for x in aliases):
            errors.append(f"{loc}: aliases must be strings")
            aliases = []
        for name in [original["name"], *aliases]:
            if isinstance(name, str):
                norm = " ".join(name.lower().split())
                if norm in names:
                    errors.append(f"{loc}: duplicate name/alias: {name}")
                names.add(norm)

    project_by_slug = {}
    seen_repos = set()
    project_originals = set()
    for path in sorted(
        (root / "apps/frontend/remade-wiki/src/content/catalog/projects").rglob("*.yaml")
    ):
        loc = str(path.relative_to(root))
        project = checked_load(path, errors)
        required = {
            "slug",
            "name",
            "repository",
            "originals",
            "category",
            "languages",
            "status",
            "compatibility",
            "description",
            "license",
        }
        optional = {"platforms", "docs", "website", "mirrors", "limitations", "authors"}
        if not fields(project, required, optional, loc, errors):
            continue
        slug = project["slug"]
        if not is_slug(slug) or path.stem != slug:
            errors.append(f"{loc}: slug must match filename and be lowercase-kebab-case")
        if isinstance(slug, str) and slug in project_by_slug:
            errors.append(f"{loc}: duplicate project slug")
        else:
            if isinstance(slug, str):
                project_by_slug[slug] = project
        repo = project["repository"]
        if not is_https(repo):
            errors.append(f"{loc}: repository must be a public HTTPS URL")
        else:
            parts = urlsplit(repo)
            segments = parts.path.strip("/").removesuffix(".git").split("/")
            if (
                parts.query
                or parts.fragment
                or len(segments) < 2
                or any(not segment for segment in segments)
            ):
                errors.append(
                    f"{loc}: repository must link to a repository root, not an issue, subpage, or search result"
                )
            elif parts.hostname == "github.com" and (
                len(segments) != 2 or parts.path.endswith(("/", ".git"))
            ):
                errors.append(
                    f"{loc}: GitHub repository must be canonical https://github.com/owner/repo"
                )
            else:
                normalized = f"{parts.hostname.casefold()}/{'/'.join(segments).casefold()}"
                if normalized in seen_repos:
                    errors.append(f"{loc}: duplicate repository {normalized}")
                seen_repos.add(normalized)
        targets = project["originals"]
        if (
            not isinstance(targets, list)
            or not targets
            or any(not is_slug(target) for target in targets)
        ):
            errors.append(f"{loc}: originals must be a nonempty list of original slugs")
        else:
            if len(set(targets)) != len(targets):
                errors.append(f"{loc}: duplicate project original")
            for target in targets:
                if target not in original_by_slug:
                    errors.append(f"{loc}: unknown original {target}")
                else:
                    project_originals.add(target)
        if not is_text(project["name"], 2, 100):
            errors.append(f"{loc}: invalid name")
        if not isinstance(project["category"], str) or project["category"] not in CATEGORIES:
            errors.append(f"{loc}: invalid category")
        langs = project["languages"]
        if not isinstance(langs, list) or not langs or any(not is_text(x, 1, 40) for x in langs):
            errors.append(f"{loc}: languages must be a nonempty list of strings")
        platforms = project.get("platforms", [])
        if not isinstance(platforms, list) or any(not is_text(x, 1, 40) for x in platforms):
            errors.append(f"{loc}: platforms must be a list of strings")
        if not isinstance(project["status"], str) or project["status"] not in STATUSES:
            errors.append(f"{loc}: invalid status")
        if (
            not isinstance(project["compatibility"], str)
            or project["compatibility"] not in COMPATIBILITY
        ):
            errors.append(f"{loc}: invalid compatibility")
        if not is_text(project["description"], 20, 400):
            errors.append(f"{loc}: description must be 20–400 plain-text characters")
        if not is_text(project["license"], 2, 80):
            errors.append(f"{loc}: license must be a short license identifier")
        if "limitations" in project and not is_text(project["limitations"], 2, 400):
            errors.append(f"{loc}: invalid limitations text")
        if "docs" in project and not is_https(project["docs"]):
            errors.append(f"{loc}: docs must be a public HTTPS URL")
        if "website" in project and not is_https(project["website"]):
            errors.append(f"{loc}: website must be a public HTTPS URL")
        validate_authors(project, loc, errors)
        validate_mirrors(project, loc, errors)

    request_by_original = {}
    for path in sorted(
        (root / "apps/frontend/remade-wiki/src/content/catalog/requests").rglob("*.yaml")
    ):
        loc = str(path.relative_to(root))
        req = checked_load(path, errors)
        if not fields(req, {"original", "reason"}, {"suggested_names"}, loc, errors):
            continue
        original_slug = req["original"]
        if not is_slug(original_slug) or original_slug != path.stem:
            errors.append(f"{loc}: filename must match original slug")
        if not isinstance(original_slug, str) or original_slug not in original_by_slug:
            errors.append(f"{loc}: unknown original {original_slug}")
        if isinstance(original_slug, str) and original_slug in project_originals:
            errors.append(f"{loc}: already fulfilled by an indexed project; remove this request")
        if isinstance(original_slug, str) and original_slug in request_by_original:
            errors.append(f"{loc}: duplicate request for original")
        if isinstance(original_slug, str):
            request_by_original[original_slug] = req
        if not is_text(req["reason"], 20, 400):
            errors.append(f"{loc}: reason must be 20–400 plain-text characters")
        if "suggested_names" in req:
            suggested_names = req["suggested_names"]
            if (
                not isinstance(suggested_names, list)
                or not suggested_names
                or any(not is_text(name, 2, 100) for name in suggested_names)
            ):
                errors.append(
                    f"{loc}: suggested_names must be a nonempty list of 2–100 character plain-text names"
                )
            elif len({" ".join(name.casefold().split()) for name in suggested_names}) != len(
                suggested_names
            ):
                errors.append(f"{loc}: duplicate suggested name")

    tools, tool_errors = collect_tools(root)
    errors.extend(tool_errors)
    tool_slugs = set()
    for tool in tools:
        slug = tool["slug"]
        tool_slugs.add(slug)
        if slug in project_by_slug:
            errors.append(f"tools/{slug}: slug already used by a project")
        parts = urlsplit(tool["repository"])
        repository = (
            f"{parts.hostname.casefold()}/{parts.path.strip('/').removesuffix('.git').casefold()}"
        )
        if repository in seen_repos:
            errors.append(f"tools/{slug}: repository already used by a project")
        for project_slug in tool["projects"]:
            if project_slug not in project_by_slug:
                errors.append(f"tools/{slug}: unknown project {project_slug}")

    featured_slugs = set()
    for i, slug in enumerate(featured):
        if not is_slug(slug):
            errors.append(
                f"apps/frontend/remade-wiki/src/content/catalog/featured.yaml entry #{i + 1}: invalid slug"
            )
        elif slug in featured_slugs:
            errors.append(
                f"apps/frontend/remade-wiki/src/content/catalog/featured.yaml entry #{i + 1}: duplicate featured slug {slug}"
            )
        elif slug not in project_by_slug and slug not in tool_slugs:
            errors.append(
                f"apps/frontend/remade-wiki/src/content/catalog/featured.yaml entry #{i + 1}: unknown project or tool {slug}"
            )
        featured_slugs.add(slug)
    return (
        originals,
        list(project_by_slug.values()),
        list(request_by_original.values()),
        featured,
        errors,
    )


def validate_mirrors(record: dict, loc: str, errors: list[str]) -> None:
    if "mirrors" in record:
        mirrors = record["mirrors"]
        if not isinstance(mirrors, list) or not mirrors:
            errors.append(f"{loc}: mirrors must be a nonempty list of repository URLs")
        else:
            seen_mirrors = set()
            for mirror in mirrors:
                if not is_https(mirror):
                    errors.append(f"{loc}: mirror must be a public HTTPS URL")
                    continue
                parts = urlsplit(mirror)
                segments = parts.path.removeprefix("/").split("/")
                if (
                    parts.query
                    or parts.fragment
                    or len(segments) < 2
                    or any(not segment for segment in segments)
                    or (
                        parts.hostname == "github.com"
                        and (len(segments) != 2 or parts.path.endswith(".git"))
                    )
                ):
                    errors.append(f"{loc}: mirror must be a canonical repository root")
                normalized = mirror.casefold().removesuffix(".git")
                if normalized in seen_mirrors:
                    errors.append(f"{loc}: duplicate mirror repository")
                seen_mirrors.add(normalized)


def collect_tools(root: Path = ROOT) -> tuple[list[dict], list[str]]:
    tools: list[dict] = []
    errors: list[str] = []
    seen_repositories: set[str] = set()
    for path in sorted(
        (root / "apps/frontend/remade-wiki/src/content/catalog/tools").rglob("*.yaml")
    ):
        loc = str(path.relative_to(root))
        tool = checked_load(path, errors)
        if not fields(
            tool,
            {"slug", "name", "repository", "url", "description", "projects", "languages"},
            {
                "authors",
                "platforms",
                "license",
                "status",
                "docs",
                "website",
                "limitations",
                "mirrors",
            },
            loc,
            errors,
        ):
            continue
        before = len(errors)
        if "license" in tool and not is_text(tool["license"], 2, 80):
            errors.append(f"{loc}: license must be a short license identifier")
        if "languages" in tool and (
            not isinstance(tool["languages"], list)
            or not tool["languages"]
            or any(not is_text(x, 1, 40) for x in tool["languages"])
        ):
            errors.append(f"{loc}: languages must be a nonempty list of strings")
        if "status" in tool and (
            not isinstance(tool["status"], str) or tool["status"] not in STATUSES
        ):
            errors.append(f"{loc}: invalid status")
        for field in ("docs", "website"):
            if field in tool and not is_https(tool[field]):
                errors.append(f"{loc}: {field} must be a public HTTPS URL")
        if "limitations" in tool and not is_text(tool["limitations"], 2, 400):
            errors.append(f"{loc}: limitations must be 2–400 plain-text characters")
        validate_mirrors(tool, loc, errors)
        validate_authors(tool, loc, errors)
        platforms = tool.get("platforms", [])
        if not isinstance(platforms, list) or any(not is_text(x, 1, 40) for x in platforms):
            errors.append(f"{loc}: platforms must be a list of strings")
        if not is_slug(tool["slug"]) or tool["slug"] != path.stem:
            errors.append(f"{loc}: slug must match filename and be lowercase-kebab-case")
        if not is_text(tool["name"], 2, 100):
            errors.append(f"{loc}: invalid name")
        if not is_text(tool["description"], 20, 400):
            errors.append(f"{loc}: description must be 20–400 plain-text characters")
        if not is_https(tool["url"]):
            errors.append(f"{loc}: url must be a public HTTPS URL")
        repo = tool["repository"]
        if not is_https(repo):
            errors.append(f"{loc}: repository must be a public HTTPS URL")
        else:
            parts = urlsplit(repo)
            segments = parts.path.strip("/").removesuffix(".git").split("/")
            if (
                parts.query
                or parts.fragment
                or len(segments) < 2
                or any(not segment for segment in segments)
                or (
                    parts.hostname == "github.com"
                    and (len(segments) != 2 or parts.path.endswith(("/", ".git")))
                )
            ):
                errors.append(f"{loc}: repository must be a canonical repository root")
            normalized = f"{parts.hostname.casefold()}/{'/'.join(segments).casefold()}"
            if normalized in seen_repositories:
                errors.append(f"{loc}: duplicate repository {normalized}")
            seen_repositories.add(normalized)
        projects = tool["projects"]
        if (
            not isinstance(projects, list)
            or not projects
            or any(not is_slug(slug) for slug in projects)
        ):
            errors.append(f"{loc}: projects must be a nonempty list of project slugs")
        elif len(set(projects)) != len(projects):
            errors.append(f"{loc}: duplicate project reference")
        if len(errors) == before:
            tools.append(tool)
    return tools, errors


def validate_authors(entry: dict, loc: str, errors: list[str]) -> None:
    if "authors" not in entry:
        return
    authors = entry["authors"]
    if (
        not isinstance(authors, list)
        or not authors
        or any(not isinstance(slug, str) or not AUTHOR_SLUG.fullmatch(slug) for slug in authors)
    ):
        errors.append(f"{loc}: authors must be a nonempty list of lowercase GitHub handles")
        return
    if len(set(authors)) != len(authors):
        errors.append(f"{loc}: duplicate author reference")


def entries_by_author(projects: list[dict], tools: list[dict]) -> dict[str, dict]:
    """Group validated indexed entries, independently of featured selections."""
    groups: dict[str, dict] = {}
    for kind, entries in (("projects", projects), ("tools", tools)):
        for entry in sorted(entries, key=lambda item: (item["name"].casefold(), item["slug"])):
            for slug in entry.get("authors", []):
                if slug not in groups:
                    groups[slug] = {
                        "github_user": slug,
                        "url": f"https://github.com/{slug}",
                        "projects": [],
                        "tools": [],
                    }
                groups[slug][kind].append(entry)
    return dict(sorted(groups.items()))
