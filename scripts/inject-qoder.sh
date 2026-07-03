#!/bin/bash
# 批量注入 lm-skill 到 Qoder
# Usage: bash scripts/inject-qoder.sh [project-root]

set -e

SKILLS_DIR="${LM_SKILLS_DIR:-/Users/zm/lm/lm-skill}"
PROJECT_ROOT="${1:-$(pwd)}"
QODER_SKILLS="$PROJECT_ROOT/.qoder/skills"
QODER_COMMANDS="$PROJECT_ROOT/.qoder/commands"

echo "=== lm-console: inject to Qoder ==="
echo "Skills: $SKILLS_DIR"
echo "Target: $PROJECT_ROOT"
echo ""

mkdir -p "$QODER_SKILLS" "$QODER_COMMANDS"

count=0
while IFS= read -r skill_file; do
  parent_dir="$(dirname "$skill_file")"
  skill_name=$(basename "$parent_dir")

  target_dir="$QODER_SKILLS/$skill_name"
  mkdir -p "$target_dir"
  cp "$skill_file" "$target_dir/SKILL.md"

  description=$(head -30 "$skill_file" | grep 'description:' | sed 's/.*description: *//;s/^"//;s/"$//' | head -1)
  cmd_dir="$QODER_COMMANDS/$skill_name"
  mkdir -p "$cmd_dir"
  cat > "$cmd_dir/config.json" << EOF
{
  "command": "$skill_name",
  "description": "$description",
  "skill": "$skill_name"
}
EOF

  echo "  [OK] $skill_name"
  count=$((count + 1))
done < <(find "$SKILLS_DIR" -name "SKILL.md" -not -path "*/\.*" 2>/dev/null)

echo ""
echo "Done! $count skills injected to Qoder"
