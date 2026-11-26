#!/usr/bin/env bash
set -euo pipefail

CLI="${1:-./build/bt3_archive_cli}"
BSDTAR="${2:-bsdtar}"
ISO_TOOL="${3:-genisoimage}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$WORK/source/subdir"
printf 'BT3 archive smoke test\n' > "$WORK/source/subdir/sample.txt"

"$BSDTAR" --format=7zip -cf "$WORK/sample.7z" -C "$WORK/source" .
"$CLI" "$WORK/sample.7z" > "$WORK/list-7z.txt"
grep -q 'sample.txt' "$WORK/list-7z.txt"
idx="$(awk -F '\t' '$3 ~ /(^|\/)subdir\/sample.txt$/ {print $1; exit}' "$WORK/list-7z.txt")"
test -n "$idx"
"$CLI" --extract "$idx" "$WORK/sample.7z" "$WORK/out-7z" > /dev/null
test -f "$WORK/out-7z/subdir/sample.txt"
grep -q 'BT3 archive smoke test' "$WORK/out-7z/subdir/sample.txt"

"$ISO_TOOL" -quiet -o "$WORK/sample.iso" -R -J "$WORK/source"
"$CLI" "$WORK/sample.iso" > "$WORK/list-iso.txt"
grep -q 'sample.txt' "$WORK/list-iso.txt"
idx="$(awk -F '\t' '$3 ~ /(^|\/)subdir\/sample.txt$/ {print $1; exit}' "$WORK/list-iso.txt")"
test -n "$idx"
"$CLI" --extract "$idx" "$WORK/sample.iso" "$WORK/out-iso" > /dev/null
test -f "$WORK/out-iso/subdir/sample.txt"
grep -q 'BT3 archive smoke test' "$WORK/out-iso/subdir/sample.txt"

echo 'LibArchive 7z/ISO smoke tests: OK'
