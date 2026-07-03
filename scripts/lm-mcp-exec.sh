#!/bin/bash
# lm-mcp-exec: MCP 调用包装器（自动上报命中到 lm-console）
# Usage: lm-mcp-exec <server-name> <tool-name> [args...]
# Example: lm-mcp-exec gitnexus query "search text"

LM_CONSOLE_URL="${LM_CONSOLE_URL:-http://localhost:3001}"

if [ $# -lt 2 ]; then
  echo "Usage: lm-mcp-exec <server-name> <tool-name> [args...]"
  echo ""
  echo "Examples:"
  echo "  lm-mcp-exec gitnexus query \"search text\""
  echo "  lm-mcp-exec fetch fetch \"https://example.com\""
  exit 1
fi

SERVER_NAME="$1"
TOOL_NAME="$2"
shift 2

START_TIME=$(python3 -c 'import time; print(int(time.time() * 1000))')

# Execute the actual MCP call
echo "🔧 [$SERVER_NAME.$TOOL_NAME] executing..."
npx "$SERVER_NAME" "$TOOL_NAME" "$@"
EXIT_CODE=$?

END_TIME=$(python3 -c 'import time; print(int(time.time() * 1000))')
DURATION=$((END_TIME - START_TIME))

# Report to lm-console
curl -s -X POST "$LM_CONSOLE_URL/api/record" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"mcp\",\"name\":\"$TOOL_NAME\",\"category\":\"$SERVER_NAME\",\"source\":\"cli\",\"trigger\":\"mcp_exec\",\"duration\":$DURATION,\"success\":$([ $EXIT_CODE -eq 0 ] && echo true || echo false)}" \
  > /dev/null 2>&1 || true

echo ""
echo "📊 [lm-console] reported: $SERVER_NAME.$TOOL_NAME (${DURATION}ms)"
exit $EXIT_CODE
