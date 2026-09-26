#!/usr/bin/env python3
"""Make a Lens Studio 5.23 project's .meta files readable by Lens Studio 5.15.

5.23 writes texture compression as `PerformanceCompressionSettings`, which 5.15
doesn't know ("Couldn't find Entity creation function for type
PerformanceCompressionSettings"). This rewrites those blocks as the plain
`FileCompressionSettings` (no compression) that 5.15 understands, and removes
the "Performance Compression" preset from multi-asset metas (e.g. .glb).
Asset IDs are untouched, so scene references keep working.

Usage: python3 tools/fix_metas_for_ls515.py "/path/to/Project"
"""
import os
import re
import sys

BLOCK = re.compile(r"^(\s*)(.+?): !<PerformanceCompressionSettings>\s*$")


def indent_of(line):
    return len(line) - len(line.lstrip(" "))


def fix(text):
    lines = text.split("\n")
    out, dropped_presets = [], set()
    i = 0
    while i < len(lines):
        m = BLOCK.match(lines[i])
        if not m:
            out.append(lines[i])
            i += 1
            continue
        indent, key = len(m.group(1)), m.group(2)
        i += 1
        while i < len(lines) and lines[i].strip() and indent_of(lines[i]) > indent:
            i += 1  # skip Level / Mipmap children
        if key == "CompressionSettings":
            out.append(" " * indent + "CompressionSettings: !<FileCompressionSettings>")
            out.append(" " * (indent + 2) + "{}")
        else:
            dropped_presets.add(key)  # named preset inside ComplexCompressionSettings
    text = "\n".join(out)
    for name in dropped_presets:
        text = re.sub(r"(:\s*)" + re.escape(name) + r"\s*$", r"\1None Compression", text, flags=re.M)
    return text


def main():
    if len(sys.argv) != 2 or not os.path.isdir(sys.argv[1]):
        sys.exit(__doc__)
    changed = 0
    for folder in ("Assets", "Packages"):
        for root, _, files in os.walk(os.path.join(sys.argv[1], folder)):
            for f in files:
                if not f.endswith(".meta"):
                    continue
                path = os.path.join(root, f)
                with open(path, encoding="utf-8") as fh:
                    old = fh.read()
                if "PerformanceCompressionSettings" not in old:
                    continue
                with open(path, "w", encoding="utf-8") as fh:
                    fh.write(fix(old))
                changed += 1
                print("fixed", os.path.relpath(path, sys.argv[1]))
    print(f"{changed} .meta files updated")


if __name__ == "__main__":
    main()
