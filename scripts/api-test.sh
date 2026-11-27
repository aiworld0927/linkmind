#!/usr/bin/env bash
# LinkMind 后端接口测试脚本
# 依赖：bash、curl、jq（缺失时自动回退到 python 等价解析，逻辑一致）
# 用法：
#   BASE_URL=http://127.0.0.1:8000 AUTH_BASE_URL=http://127.0.0.1:8001 \
#   KNOWLEDGE_ROOT=/tmp/linkmind-kb bash scripts/api-test.sh
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8000}"          # 匿名放行实例（ALLOW_ANONYMOUS=true）
AUTH_BASE_URL="${AUTH_BASE_URL:-http://127.0.0.1:8001}" # 强制鉴权实例（ALLOW_ANONYMOUS=false）
API="$BASE_URL/api/v1"
AUTH_API="$AUTH_BASE_URL/api/v1"

BACKEND_DIR="${BACKEND_DIR:-$(cd "$(dirname "$0")/../backend" && pwd)}"
PYTHON_BIN="${PYTHON_BIN:-$BACKEND_DIR/.venv/bin/python}"

# 敏感信息通过环境变量注入；无登录接口（docs/18 决策 3），token 由 SECRET_KEY 本地签发
TEST_USERNAME="${TEST_USERNAME:-api-test}"
TEST_PASSWORD="${TEST_PASSWORD:-}"          # 预留：当前无登录接口，不参与签发
TOKEN="${TOKEN:-}"

UNIQUE="$(date +%s)$$"
KNOWLEDGE_ROOT="${KNOWLEDGE_ROOT:-/tmp/linkmind-kb}"
KB_SUBDIR="${KB_SUBDIR:-产品研发}"
# 仓库目录默认带唯一后缀：避免复用上次遗留的 .git 导致「没有可提交的变更」误报
GIT_SUBDIR="${GIT_SUBDIR:-api-test-repo-$UNIQUE}"

BODY_FILE="$(mktemp)"
trap 'rm -f "$BODY_FILE"' EXIT

STATUS=""; BODY="{}"; AUTH_TOKEN=""

# ---------------------------------------------------------------- 输出与统计
if [[ -t 1 ]]; then
  C_GREEN=$'\033[32m'; C_RED=$'\033[31m'; C_BLUE=$'\033[36m'; C_DIM=$'\033[2m'; C_END=$'\033[0m'
else
  C_GREEN=''; C_RED=''; C_BLUE=''; C_DIM=''; C_END=''
fi

TOTAL=0; PASSED=0; FAILED=0
FAILED_CASES=()
SECTION=""

section() { SECTION="$1"; printf '\n%s== %s ==%s\n' "$C_BLUE" "$1" "$C_END"; }
pass() { TOTAL=$((TOTAL+1)); PASSED=$((PASSED+1)); printf '  %sPASS%s %s\n' "$C_GREEN" "$C_END" "$1"; }
fail() {
  TOTAL=$((TOTAL+1)); FAILED=$((FAILED+1))
  FAILED_CASES+=("[$SECTION] $1 — $2")
  printf '  %sFAIL%s %s — %s\n' "$C_RED" "$C_END" "$1" "$2"
}

# ---------------------------------------------------------------- 解析工具（jq 优先，python 兜底）
pick() { # pick '.data.items.0.id' | '.data.repos|length'
  local path="$1"
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$BODY" | jq -r "$path" 2>/dev/null || true
  else
    BODY_JSON="$BODY" "$PYTHON_BIN" - "$path" <<'PY' 2>/dev/null || true
import json,sys,os
path=sys.argv[1].lstrip('.').replace('|length','.__len__')
try:
    d=json.loads(os.environ.get('BODY_JSON') or '{}')
except Exception:
    print(''); raise SystemExit
for part in [p for p in path.split('.') if p]:
    try:
        if part=='__len__':
            d=len(d); continue
        d = d[int(part)] if part.isdigit() else d[part]
    except Exception:
        print(''); raise SystemExit
if isinstance(d,(dict,list)): print(json.dumps(d,ensure_ascii=False))
elif isinstance(d,bool): print('true' if d else 'false')
elif d is None: print('null')
else: print(d)
PY
  fi
}

# http <method> <url> [json-body] [token|none]
http() {
  local method="$1" url="$2" data="${3-}" auth="${4:-none}"
  local -a args=(-s -o "$BODY_FILE" -w '%{http_code}' --max-time 30 -X "$method" "$url")
  if [[ -n "$data" ]]; then
    args+=(-H 'Content-Type: application/json' -d "$data")
  fi
  if [[ "$auth" == token ]]; then
    args+=(-H "Authorization: Bearer ${AUTH_TOKEN}")
  fi
  STATUS="$(curl "${args[@]}" || true)"
  BODY="$(cat "$BODY_FILE" 2>/dev/null || true)"
}

# 语义简写
GET()  { http GET  "$1" "" "${2:-none}"; }
POST() { http POST "$1" "${2:-}" "${3:-none}"; }
PUT()  { http PUT  "$1" "${2:-}" "${3:-none}"; }
DEL()  { http DELETE "$1" "" "${2:-none}"; }

# ---------------------------------------------------------------- 断言
expect_status() { # <名称> <期望HTTP>
  if [[ "$STATUS" == "$2" ]]; then pass "$1"; else fail "$1" "HTTP=$STATUS 期望=$2 body=$(head -c 300 "$BODY_FILE")"; fi
}
expect_code() { # <名称> <期望 body.code>
  local got; got="$(pick '.code')"
  if [[ "$got" == "$2" ]]; then pass "$1"; else fail "$1" "code=$got 期望=$2 body=$(head -c 300 "$BODY_FILE")"; fi
}
expect_eq() { # <名称> <pick 路径> <期望值>
  local got; got="$(pick "$2")"
  if [[ "$got" == "$3" ]]; then pass "$1"; else fail "$1" "$2=$got 期望=$3"; fi
}
expect_ge() { # <名称> <pick 路径> <最小值>
  local got; got="$(pick "$2")"
  if [[ -n "$got" && "$got" =~ ^[0-9]+$ && "$got" -ge "$3" ]]; then
    pass "$1"
  else
    fail "$1" "$2=$got 期望>=$3"
  fi
}
expect_nonempty() { # <名称> <pick 路径>
  local got; got="$(pick "$2")"
  if [[ -n "$got" && "$got" != "null" && "$got" != "" ]]; then pass "$1"; else fail "$1" "$2 为空"; fi
}
expect_ok() { # 成功响应：HTTP 200 且 code 200
  expect_status "$1" 200
  expect_code "$1.code" 200
}

# ---------------------------------------------------------------- 0. 前置检查
section "0. 服务与 OpenAPI 可用性"
if ! curl -s --max-time 10 -o /dev/null "$BASE_URL/docs"; then
  echo "${C_RED}无法访问 $BASE_URL/docs，请先启动 uvicorn${C_END}" >&2
  exit 1
fi
DOCS_STATUS="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$BASE_URL/docs")"
if [[ "$DOCS_STATUS" == "200" ]]; then pass "GET /docs 可访问"; else fail "GET /docs 可访问" "HTTP=$DOCS_STATUS"; fi

openapi_has_path() { # <path>
  if command -v jq >/dev/null 2>&1; then
    curl -s --max-time 10 "$BASE_URL/openapi.json" | jq -e --arg p "$1" '.paths[$p] != null' >/dev/null 2>&1
  else
    curl -s --max-time 10 "$BASE_URL/openapi.json" \
      | "$PYTHON_BIN" -c 'import json,sys; d=json.load(sys.stdin); sys.exit(0 if sys.argv[1] in d.get("paths",{}) else 1)' "$1" 2>/dev/null
  fi
}
for p in \
  /api/v1/health /api/v1/health/postgres \
  /api/v1/git/repos /api/v1/git/repos/{repo_id} /api/v1/git/repos/{repo_id}/commit \
  /api/v1/git/repos/{repo_id}/pull /api/v1/git/repos/{repo_id}/push \
  /api/v1/git/repos/{repo_id}/conflicts/resolve /api/v1/git/repos/{repo_id}/merge/continue \
  /api/v1/git/repos/{repo_id}/merge/abort /api/v1/git/repos/{repo_id}/log \
  /api/v1/git/repos/{repo_id}/actions \
  /api/v1/fs/dirs /api/v1/fs/tree /api/v1/docs/content \
  /api/v1/maps /api/v1/maps/{map_id} /api/v1/maps/{map_id}/tree \
  /api/v1/maps/import /api/v1/maps/export \
  /api/v1/maps/{map_id}/nodes /api/v1/maps/{map_id}/nodes/{node_id} \
  /api/v1/maps/{map_id}/nodes/{node_id}/props \
  /api/v1/maps/{map_id}/nodes/{node_id}/props/{prop_id} \
  /api/v1/maps/{map_id}/nodes/{node_id}/props/{prop_id}/note
do
  if openapi_has_path "$p"; then pass "openapi 含 $p"; else fail "openapi 含 $p" "路径缺失"; fi
done

# ---------------------------------------------------------------- 1. 健康检查
section "1. 健康检查"
GET "$API/health";            expect_ok "GET /health"; expect_eq "status=healthy" '.data.status' healthy
GET "$API/health/postgres";   expect_ok "GET /health/postgres"; expect_eq "postgres.connected" '.data.connected' true
GET "$API/health/neo4j";      expect_ok "GET /health/neo4j（连接状态可为 false）"

# ---------------------------------------------------------------- 2. 文件系统
section "2. 文件系统（B-1 / B-2 / F-3）"
GET "$API/fs/dirs?path="
expect_ok "GET /fs/dirs 根目录"
expect_nonempty "rootName 非空" '.data.rootName'
expect_eq "根目录 parent=null" '.data.parent' null

GET "$API/fs/dirs?path=%E4%BA%A7%E5%93%81%E7%A0%94%E5%8F%91"   # 产品研发
expect_ok "GET /fs/dirs 子目录"
expect_eq "产品研发 子目录数=1" '.data.dirs|length' 1
expect_eq "子目录名=架构" '.data.dirs.0.name' '架构'
expect_eq "子目录 hasChildren=false" '.data.dirs.0.hasChildren' false
expect_eq "子目录 mdCount=1" '.data.dirs.0.mdCount' 1

GET "$API/fs/dirs?path=../"
expect_status "GET /fs/dirs 路径越界 → 403" 403
expect_code "GET /fs/dirs 路径越界 code=403" 403

GET "$API/fs/dirs?path=no-such-dir"
expect_status "GET /fs/dirs 目录不存在 → 404" 404
expect_code "GET /fs/dirs 目录不存在 code=404" 404

GET "$API/fs/tree?path=%E4%BA%A7%E5%93%81%E7%A0%94%E5%8F%91"
expect_ok "GET /fs/tree 扫描"
expect_nonempty "tree.name 非空" '.data.name'
expect_nonempty "tree.props[0].content_length" '.data.props.0.content_length'

GET "$API/docs/content?path=%E4%BA%A7%E5%93%81%E7%A0%94%E5%8F%91%2F%E9%9C%80%E6%B1%82.md"
expect_ok "GET /docs/content 读取文档"
expect_eq "doc.name" '.data.name' '需求.md'

GET "$API/docs/content?path=no-such.md"
expect_status "GET /docs/content 不存在 → 404" 404

GET "$API/docs/content?path=../../../etc/passwd"
expect_status "GET /docs/content 越权 → 403" 403

# ---------------------------------------------------------------- 3. Git 仓库（A-1 ~ A-12）
section "3. Git 仓库管理（A-1 ~ A-12）"
mkdir -p "$KNOWLEDGE_ROOT/$GIT_SUBDIR"
echo "# api test" > "$KNOWLEDGE_ROOT/$GIT_SUBDIR/README.md"

POST "$API/git/repos" "{\"name\":\"接口测试仓库-$UNIQUE\",\"fs_path\":\"$GIT_SUBDIR\",\"init\":true,\"remote_url\":null}"
expect_ok "A-3 登记仓库"
REPO_ID="$(pick '.data.id')"
expect_nonempty "A-3 返回 repo.id" '.data.id'
expect_eq "A-3 fs_path 相对路径" '.data.fs_path' "$GIT_SUBDIR"

POST "$API/git/repos" "{\"name\":\"接口测试仓库-$UNIQUE\",\"fs_path\":\"$GIT_SUBDIR\",\"init\":true}"
expect_status "A-3 重名登记 → 400" 400
expect_code "A-3 重名 code=400" 400

POST "$API/git/repos" '{"name":"越界仓库","fs_path":"../outside","init":true}'
expect_code "A-3 路径越界 → 400" 400

POST "$API/git/repos" '{"name":"不存在目录","fs_path":"no-such-repo","init":true}'
expect_code "A-3 目录不存在 → 404" 404

POST "$API/git/repos" '{"name":""}'
expect_status "A-3 参数校验 → 422" 422
expect_code "A-3 参数校验 code=422" 422

GET "$API/git/repos"
expect_ok "A-1 仓库列表"
expect_ge "A-1 repos 数量>=1" '.data.repos|length' 1

GET "$API/git/repos/$REPO_ID"
expect_ok "A-2 仓库详情"
expect_eq "A-2 branch=main" '.data.branch' main

GET "$API/git/repos/00000000-0000-0000-0000-000000000000"
expect_status "A-2 仓库不存在 → 404" 404
expect_code "A-2 仓库不存在 code=404" 404

echo "# changed by api-test" >> "$KNOWLEDGE_ROOT/$GIT_SUBDIR/README.md"
POST "$API/git/repos/$REPO_ID/commit" '{"message":"接口测试提交","paths":null,"all":true}'
expect_ok "A-5 提交全部变更"
expect_eq "A-5 返回 msg" '.msg' '提交完成'

http POST "$API/git/repos/$REPO_ID/commit" '{"message":"空提交"}'
expect_status "A-5 缺少提交目标 → 422" 422

POST "$API/git/repos/$REPO_ID/commit" '{"message":"无变更提交","paths":null,"all":true}'
expect_code "A-5 无可提交变更 → 400" 400

POST "$API/git/repos/$REPO_ID/pull"
expect_code "A-6 无上游分支拉取 → 400" 400

POST "$API/git/repos/$REPO_ID/push"
expect_code "A-7 无上游分支推送 → 400" 400

POST "$API/git/repos/$REPO_ID/conflicts/resolve" '{"path":"README.md","strategy":"ours"}'
expect_code "A-8 非冲突文件解决 → 400" 400

POST "$API/git/repos/$REPO_ID/conflicts/resolve" '{"path":"README.md","strategy":"content"}'
expect_status "A-8 strategy=content 缺 content → 422" 422

POST "$API/git/repos/$REPO_ID/merge/continue"
expect_code "A-9 无合并可继续 → 400" 400

POST "$API/git/repos/$REPO_ID/merge/abort"
expect_code "A-10 无合并可中止 → 400" 400

GET "$API/git/repos/$REPO_ID/log?page=1&page_size=1"
expect_ok "A-11 提交历史（分页）"
expect_ge "A-11 total>=2" '.data.total' 2
expect_eq "A-11 单页条数=1" '.data.items|length' 1

GET "$API/git/repos/$REPO_ID/actions?page=1&page_size=5"
expect_ok "A-12 动作审计（分页）"
expect_ge "A-12 total>=1" '.data.total' 1
expect_nonempty "A-12 items[0].ts 为时间" '.data.items.0.ts'

GET "$API/git/repos/$REPO_ID/log?page=0"
expect_status "A-11 page=0 → 422" 422

DEL "$API/git/repos/$REPO_ID"
expect_ok "A-4 移除仓库"
expect_eq "A-4 removed=true" '.data.removed' true

GET "$API/git/repos/$REPO_ID"
expect_status "A-4 移除后查询 → 404" 404

# ---------------------------------------------------------------- 4. 知识地图（C-1 ~ C-8）
section "4. 知识地图（C-1 ~ C-8）"
POST "$API/maps" "{\"title\":\"接口测试地图-$UNIQUE\",\"desc\":\"api-test\"}"
expect_ok "C-2 创建地图"
MAP_ID="$(pick '.data.id')"
expect_nonempty "C-2 返回 map.id" '.data.id'

POST "$API/maps" "{\"title\":\"接口测试地图-$UNIQUE\"}"
expect_code "C-2 重名创建 → 400" 400

POST "$API/maps" '{"title":""}'
expect_status "C-2 标题为空 → 422" 422

GET "$API/maps?page=1&page_size=10&keyword=%E6%8E%A5%E5%8F%A3%E6%B5%8B%E8%AF%95"
expect_ok "C-1 地图列表（keyword + 分页）"
expect_ge "C-1 total>=1" '.data.total' 1
expect_nonempty "C-1 items[0].node_count" '.data.items.0.node_count'

PUT "$API/maps/$MAP_ID" '{"desc":"新描述"}'
expect_ok "C-3 更新地图"
expect_eq "C-3 desc 已更新" '.data.desc' '新描述'

PUT "$API/maps/00000000-0000-0000-0000-000000000000" '{"desc":"x"}'
expect_status "C-3 地图不存在 → 404" 404

PUT "$API/maps/$MAP_ID" '{"repo":{"id":"00000000-0000-0000-0000-000000000001"}}'
expect_code "C-3 绑定不存在仓库 → 404" 404

PUT "$API/maps/$MAP_ID/tree" '{"nodes":[{"name":"前端","props":[{"label":"选型","note":{"c":"React","t":["前端"],"r":""}}],"children":[{"name":"组件","props":[],"children":[]}]},{"name":"后端","props":[],"children":[]}]}'
expect_ok "C-6 整树保存"
expect_eq "C-6 一级节点数=2" '.data.nodes|length' 2
expect_eq "C-6 子节点名" '.data.nodes.0.children.0.name' '组件'
expect_eq "C-6 节点属性 label" '.data.nodes.0.props.0.label' '选型'

GET "$API/maps/$MAP_ID/tree"
expect_ok "C-5 整树查询"
expect_eq "C-5 节点数一致" '.data.nodes|length' 2

PUT "$API/maps/$MAP_ID/tree" '{"nodes":[{"name":"重复","props":[],"children":[]},{"name":"重复","props":[],"children":[]}]}'
expect_code "C-6 同级重名 → 400" 400

POST "$API/maps/import" "{\"path\":\"$KB_SUBDIR\",\"title\":\"导入地图-$UNIQUE\"}"
expect_ok "C-7 目录导入"
IMPORT_ID="$(pick '.data.id')"
expect_eq "C-7 导入标题" '.data.title' "导入地图-$UNIQUE"
expect_nonempty "C-7 文档属性 path" '.data.nodes.0.props.0.path'

POST "$API/maps/import" "{\"path\":\"$KB_SUBDIR\",\"title\":\"导入地图-$UNIQUE\"}"
expect_code "C-7 同名重复导入 → 400" 400

POST "$API/maps/import" '{}'
expect_status "C-7 缺少导入来源 → 422" 422

GET "$API/maps/export"
expect_ok "C-8 地图导出"
expect_eq "C-8 app" '.data.app' linkmind
expect_eq "C-8 version" '.data.version' 1
expect_nonempty "C-8 exportedAt" '.data.exportedAt'
expect_ge "C-8 导出地图数>=1" '.data.maps|length' 1

# ---------------------------------------------------------------- 5. 节点编辑（D-1 ~ D-3）
section "5. 脑图节点编辑（D-1 ~ D-3）"
POST "$API/maps/$MAP_ID/nodes" '{"parent_id":"ROOT","name":"章节A"}'
expect_ok "D-1 新增根级节点"
NODE_A="$(pick '.data.id')"

POST "$API/maps/$MAP_ID/nodes" '{"parent_id":"ROOT","name":"章节B"}'
expect_ok "D-1 新增第二个根级节点"
NODE_B="$(pick '.data.id')"

POST "$API/maps/$MAP_ID/nodes" '{"parent_id":"ROOT","name":"章节A"}'
expect_code "D-1 同级重名 → 400" 400

POST "$API/maps/$MAP_ID/nodes" '{"parent_id":"not-a-uuid","name":"非法父级"}'
expect_status "D-1 parent_id 非法 → 422" 422

POST "$API/maps/$MAP_ID/nodes" '{"parent_id":"00000000-0000-0000-0000-000000000002","name":"父级不存在"}'
expect_code "D-1 父节点不存在 → 404" 404

PUT "$API/maps/$MAP_ID/nodes/$NODE_A" '{"name":"章节A改"}'
expect_ok "D-2 重命名节点"
expect_eq "D-2 新名称" '.data.name' '章节A改'

PUT "$API/maps/$MAP_ID/nodes/ROOT" "{\"name\":\"重命名地图-$UNIQUE\"}"
expect_ok "D-2 重命名 ROOT（等价改地图标题）"
expect_eq "D-2 ROOT 返回 TreeMap" '.data.title' "重命名地图-$UNIQUE"

PUT "$API/maps/$MAP_ID/nodes/00000000-0000-0000-0000-000000000003" '{"name":"x"}'
expect_code "D-2 节点不存在 → 404" 404

DEL "$API/maps/$MAP_ID/nodes/ROOT"
expect_code "D-3 删除 ROOT → 400" 400

GET "$API/maps/$MAP_ID/tree"
NODES_BEFORE="$(pick '.data.nodes|length')"
expect_ge "D-3 删除前一级节点数>=4（C-6 预置 2 + D-1 新增 2）" '.data.nodes|length' 4

# ---------------------------------------------------------------- 6. 属性编辑（E-1 ~ E-3）
section "6. 属性与文档编辑（E-1 ~ E-3）"
POST "$API/maps/$MAP_ID/nodes/$NODE_A/props" '{"label":"属性A","note":{"c":"笔记正文","t":["tag1"],"r":"备注"}}'
expect_ok "E-1 新增节点属性"
PROP_A="$(pick '.data.prop_id')"
expect_nonempty "E-1 返回 prop_id" '.data.prop_id'
expect_eq "E-1 note.t" '.data.note.t.0' tag1

POST "$API/maps/$MAP_ID/nodes/ROOT/props" '{"label":"根属性","note":{"c":"","t":[],"r":""}}'
expect_ok "E-1 新增地图级属性（ROOT）"
ROOT_PROP="$(pick '.data.prop_id')"

POST "$API/maps/$MAP_ID/nodes/$NODE_A/props" '{"label":"","note":{"c":"","t":[],"r":""}}'
expect_status "E-1 label 为空 → 422" 422

PUT "$API/maps/$MAP_ID/nodes/$NODE_A/props/$PROP_A" '{"label":"属性A改","note":{"c":"更新后","t":[],"r":""}}'
expect_ok "E-2 编辑属性"
expect_eq "E-2 正文已更新" '.data.note.c' '更新后'

PUT "$API/maps/$MAP_ID/nodes/ROOT/props/$PROP_A" '{"label":"x","note":{"c":"","t":[],"r":""}}'
expect_code "E-2 属性不属于该节点 → 404" 404

# ---------------------------------------------------------------- 7. 笔记读写（F-1 / F-2）
section "7. 文档内容编辑（F-1 / F-2）"
GET "$API/maps/$MAP_ID/nodes/$NODE_A/props/$PROP_A/note"
expect_ok "F-1 读取笔记"
expect_eq "F-1 正文" '.data.content' '更新后'
expect_nonempty "F-1 node_path 层级路径" '.data.node_path'
expect_eq "F-1 doc=false" '.data.doc' false

PUT "$API/maps/$MAP_ID/nodes/$NODE_A/props/$PROP_A/note" '{"content":"# 新笔记","tags":["a","b"],"remark":"r1"}'
expect_ok "F-2 保存笔记"
expect_eq "F-2 正文已保存" '.data.note.c' '# 新笔记'
expect_eq "F-2 标签已保存" '.data.note.t|length' 2

PUT "$API/maps/$MAP_ID/nodes/$NODE_A/props/$PROP_A/note" '{"content":"# 部分更新","tags":null,"remark":null}'
expect_ok "F-2 只更新正文（tags/remark 保持）"
expect_eq "F-2 标签保持" '.data.note.t|length' 2

GET "$API/maps/$MAP_ID/nodes/ROOT/props/$ROOT_PROP/note"
expect_ok "F-1 地图级笔记"
expect_nonempty "F-1 地图级 node_path=地图标题" '.data.node_path'

GET "$API/maps/$MAP_ID/nodes/$NODE_A/props/00000000-0000-0000-0000-000000000004/note"
expect_status "F-1 属性不存在 → 404" 404

# ---------------------------------------------------------------- 8. 删除闭环
section "8. 删除闭环（E-3 / D-3 / C-4）"
DEL "$API/maps/$MAP_ID/nodes/$NODE_A/props/$PROP_A"
expect_ok "E-3 删除属性"
expect_eq "E-3 removed=true" '.data.removed' true

DEL "$API/maps/$MAP_ID/nodes/$NODE_A/props/$PROP_A"
expect_code "E-3 重复删除 → 404" 404

DEL "$API/maps/$MAP_ID/nodes/$NODE_B"
expect_ok "D-3 删除节点（级联）"

GET "$API/maps/$MAP_ID/tree"
expect_ok "D-3 删除后整树可查"
NODES_AFTER="$(pick '.data.nodes|length')"
if [[ -n "$NODES_AFTER" && "$NODES_AFTER" -eq $((NODES_BEFORE - 1)) ]]; then
  pass "D-3 删除节点后一级节点数 -1（$NODES_BEFORE → $NODES_AFTER）"
else
  fail "D-3 删除节点后一级节点数 -1" "before=$NODES_BEFORE after=$NODES_AFTER"
fi

DEL "$API/maps/$MAP_ID"
expect_ok "C-4 删除地图"

GET "$API/maps/$MAP_ID/tree"
expect_status "C-4 删除后查询 → 404" 404

DEL "$API/maps/$IMPORT_ID"
expect_ok "C-4 清理导入地图"

# ---------------------------------------------------------------- 9. 鉴权（ALLOW_ANONYMOUS=false 实例）
section "9. 鉴权（强制鉴权实例 $AUTH_BASE_URL）"
if curl -s --max-time 5 -o /dev/null "$AUTH_BASE_URL/docs"; then
  AUTH_TOKEN=""
  http GET "$AUTH_API/maps" "" none
  expect_status "无 Token 访问受保护接口 → 401" 401
  expect_code "无 Token code=401" 401

  AUTH_TOKEN="invalid.token.value"
  http GET "$AUTH_API/maps" "" token
  expect_status "无效 Token → 401" 401

  if [[ -z "$TOKEN" ]]; then
    TOKEN="$(cd "$BACKEND_DIR" && "$PYTHON_BIN" -c \
      "from app.core.security import create_access_token; print(create_access_token('${TEST_USERNAME}'))" 2>/dev/null || true)"
  fi
  if [[ -n "$TOKEN" ]]; then
    pass "本地签发 JWT（SECRET_KEY，subject=$TEST_USERNAME）"
    AUTH_TOKEN="$TOKEN"
    http GET "$AUTH_API/maps" "" token
    expect_ok "携带有效 Token 访问 → 200"
  else
    fail "本地签发 JWT" "无法生成 token，检查 SECRET_KEY 与后端依赖"
  fi
else
  echo "  ${C_DIM}跳过：$AUTH_BASE_URL 未启动（需 ALLOW_ANONYMOUS=false 实例）${C_END}"
fi

# ---------------------------------------------------------------- 汇总
printf '\n%s== 测试汇总 ==%s\n' "$C_BLUE" "$C_END"
printf '  总数: %d  通过: %s%d%s  失败: %s%d%s\n' \
  "$TOTAL" "$C_GREEN" "$PASSED" "$C_END" "$C_RED" "$FAILED" "$C_END"
if (( FAILED > 0 )); then
  printf '\n失败明细:\n'
  for item in "${FAILED_CASES[@]}"; do printf '  - %s\n' "$item"; done
  exit 1
fi
printf '  全部用例通过\n'
