#!/usr/bin/env python3
"""Rewrite broken relative imports in Foundation module to point at new layout.

Legacy one-shot maintenance script from the pre-Batch-2A layout migration.
Kept under modules/foundation/ops/scripts for historical reference. After
Batch 2A (b2_foundation), the canonical Foundation source lives at
"<platform-root>/modules/foundation". Update PLATFORM_ROOT below if you
re-run this script against a different checkout.
"""
import os
import re
from pathlib import Path

# Canonical platform root after Batch 2A canonical-source restructure.
PLATFORM_ROOT = Path("/root/DOS-AIO/DOS Platform")
ROOT = PLATFORM_ROOT / "modules" / "foundation"
BUILD_DIRS = ["contracts", "domain", "application", "infrastructure", "interface", "ports", "schemas", "config"]
ROOT_FILES = ["index.ts", "foundation.manifest.ts"]

INDEX = {}
BASENAME_INDEX = {}

def collect():
    for d in BUILD_DIRS:
        for f in (ROOT / d).rglob("*.ts"):
            if f.suffix == ".ts" and not f.name.endswith(".test.ts") and not f.name.endswith(".spec.ts"):
                rel = f.relative_to(ROOT).with_suffix("")
                INDEX[str(rel)] = f
                BASENAME_INDEX.setdefault(f.stem, []).append(f)
    for f in ROOT_FILES:
        p = ROOT / f
        if p.exists():
            rel = p.relative_to(ROOT).with_suffix("")
            INDEX[str(rel)] = p
            BASENAME_INDEX.setdefault(p.stem, []).append(p)

collect()

REMAP_HINTS = [
    ("events/foundation.publishers", "infrastructure/messaging/foundation.publishers"),
    ("events/foundation.outbox-binder", "infrastructure/messaging/foundation.outbox-binder"),
    ("events/foundation.events", "infrastructure/messaging/foundation.events"),
    ("events/", "infrastructure/messaging/"),
    ("routes/", "interface/http/"),
    ("controllers/", "interface/http/controllers/"),
    ("middleware/", "interface/http/middleware/"),
    ("admin/", "interface/admin/"),
    ("diagnostics/", "interface/diagnostics/"),
    ("security/", "interface/security/"),
    ("i18n/", "interface/i18n/"),
    ("repositories/", "infrastructure/persistence/"),
    ("mappers/", "infrastructure/persistence/mappers/"),
    ("data/", "infrastructure/persistence/"),
    ("adapters/", "infrastructure/"),
    ("observability/metrics", "infrastructure/observability/metrics"),
    ("observability/", "infrastructure/observability/"),
    ("services/legacy/", "application/"),
    ("services/", "application/"),
    ("policies/", "domain/policies/"),
    ("types/", "domain/types/"),
    ("errors/", "domain/errors/"),
    ("shared/error-catalog.types", "domain/shared/error-catalog.types"),
    ("shared/", "domain/shared/"),
]

def resolve_target(spec_rel_to_root):
    if spec_rel_to_root in INDEX:
        return INDEX[spec_rel_to_root]
    if (spec_rel_to_root + "/index") in INDEX:
        return INDEX[spec_rel_to_root + "/index"]
    for stale, new in REMAP_HINTS:
        if stale and stale in spec_rel_to_root:
            candidate = spec_rel_to_root.replace(stale, new, 1)
            candidate = re.sub(r'/+', '/', candidate).strip("/")
            if candidate in INDEX:
                return INDEX[candidate]
            if (candidate + "/index") in INDEX:
                return INDEX[candidate + "/index"]
    base = spec_rel_to_root.rsplit("/", 1)[-1]
    if base in BASENAME_INDEX and len(BASENAME_INDEX[base]) == 1:
        return BASENAME_INDEX[base][0]
    return None

def compute_relative(from_file: Path, to_file: Path) -> str:
    rel = os.path.relpath(to_file.with_suffix(""), from_file.parent)
    if not rel.startswith("."):
        rel = "./" + rel
    return rel

IMPORT_RE = re.compile(r"""(import\s+(?:[^'"]+from\s+)?|export\s+(?:[^'"]*from\s+)?|require\s*\(\s*)(['"])(\.\.?[^'"]*)(['"])""")

def fix_file(file: Path):
    src = file.read_text()
    changed = False

    def repl(m):
        nonlocal changed
        prefix, q1, spec, q2 = m.group(1), m.group(2), m.group(3), m.group(4)
        target_path = (file.parent / spec).resolve()
        candidates = [
            target_path.with_suffix(".ts"),
            Path(str(target_path) + ".ts"),
            target_path / "index.ts",
            Path(str(target_path) + ".json"),
        ]
        if any(c.exists() for c in candidates) or (target_path.exists() and target_path.is_file()):
            return m.group(0)
        try:
            spec_rel_root = str(target_path.relative_to(ROOT))
        except ValueError:
            return m.group(0)
        new_target = resolve_target(spec_rel_root)
        if new_target is None:
            return m.group(0)
        new_rel = compute_relative(file, new_target)
        changed = True
        return f"{prefix}{q1}{new_rel}{q2}"

    new_src = IMPORT_RE.sub(repl, src)
    if changed:
        file.write_text(new_src)
        return True
    return False

fixed = 0
for d in BUILD_DIRS:
    for f in (ROOT / d).rglob("*.ts"):
        if f.suffix == ".ts" and not f.name.endswith(".test.ts") and not f.name.endswith(".spec.ts"):
            if fix_file(f):
                fixed += 1
for f in ROOT_FILES:
    p = ROOT / f
    if p.exists() and fix_file(p):
        fixed += 1

print(f"Fixed {fixed} files")
