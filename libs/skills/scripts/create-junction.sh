#!/bin/bash
# ============================================================
# 创建 Windows 目录连接点 (Junction)
# Windows 下 Git Bash 的 ln -s 不可靠（会创建副本），
# 必须用 PowerShell 的 Junction 来实现真正的目录链接。
#
# 用法:
#   ./create-junction.sh <源目录> <链接名>
#
# 示例:
#   # 在 skills 目录下创建 gitnexus-cli → gitnexus/gitnexus-cli
#   cd ~/.claude/skills
#   ./scripts/create-junction.sh gitnexus/gitnexus-cli gitnexus-cli
#
#   # 用绝对路径
#   ./scripts/create-junction.sh \
#       "C:/Users/liming/.claude/skills/gitnexus/gitnexus-cli" \
#       "C:/Users/liming/.claude/skills/gitnexus-cli"
# ============================================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

usage() {
    echo "用法: $0 <源目录> <链接名>"
    echo ""
    echo "  源目录   - 要链接到的目标目录（必须存在）"
    echo "  链接名   - 要创建的 Junction 名称/路径"
    echo ""
    echo "示例:"
    echo "  $0 gitnexus/gitnexus-cli gitnexus-cli"
    echo "  $0 /path/to/source /path/to/link"
    exit 1
}

# 参数检查
if [ $# -ne 2 ]; then
    usage
fi

SOURCE="$1"
LINK="$2"

# 将路径转换为 Windows 格式
to_win_path() {
    local path="$1"
    # 已经是 Windows 格式 (C:\... 或 C:/...)，只需统一反斜杠
    if echo "$path" | grep -qE '^[A-Za-z]:'; then
        echo "$path" | sed 's/\//\\/g'
        return
    fi
    # Unix 风格：先解析为绝对路径，再转换 /c/... → C:\...
    local abs
    if [ -e "$path" ] || [ -d "$(dirname "$path")" ]; then
        abs=$( (cd "$path" 2>/dev/null && pwd) || (cd "$(dirname "$path")" 2>/dev/null && echo "$(pwd)/$(basename "$path")") )
    else
        # 目标路径尚不存在（如 LINK），尝试通过 dirname 解析
        abs=$(cd "$(dirname "$path")" 2>/dev/null && echo "$(pwd)/$(basename "$path")" || echo "$path")
    fi
    echo "$abs" | sed 's|^/\([a-z]\)/|\1:\\|;s|/|\\|g'
}

WIN_SOURCE=$(to_win_path "$SOURCE")
WIN_LINK=$(to_win_path "$LINK")

# 检查源目录是否存在
if [ ! -d "$SOURCE" ]; then
    echo -e "${RED}错误: 源目录不存在: $SOURCE${NC}"
    exit 1
fi

# 如果链接已存在，先删除
if [ -e "$LINK" ]; then
    echo -e "${YELLOW}链接已存在，正在删除: $LINK${NC}"
    rm -rf "$LINK"
fi

# 使用 PowerShell 创建 Junction
echo -e "${GREEN}创建 Junction:${NC}"
echo "  源:   $SOURCE  →  $WIN_SOURCE"
echo "  链接: $LINK   →  $WIN_LINK"

powershell -Command "New-Item -ItemType Junction -Path '$WIN_LINK' -Target '$WIN_SOURCE'" 2>&1 | tail -1

# 验证
if [ -d "$LINK" ]; then
    echo ""
    echo -e "${GREEN}✅ Junction 创建成功${NC}"
    echo ""
    # 快速验证：列出链接目录的文件数
    COUNT=$(ls -1 "$LINK" 2>/dev/null | wc -l)
    echo "链接目录内容（$COUNT 个文件/目录）:"
    ls -1 "$LINK"
else
    echo -e "${RED}❌ Junction 创建失败${NC}"
    exit 1
fi
