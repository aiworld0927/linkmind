#!/bin/bash
# PostgreSQL 主库自动备份脚本（详见 docs/05_运维手册.md）
# 用法：bash scripts/backup.sh
# 说明：通过 docker exec/cp 从 linkmind-postgres 容器导出自定义格式备份，
#       并清理 7 天前的备份目录。需具备 docker 命令权限。
set -euo pipefail

BACKUP_DIR="/backup/postgres/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"
FILE="$BACKUP_DIR/linkmind-$(date +%Y%m%d-%H%M).dump"

echo "=== 开始备份 PostgreSQL 主库 ==="
docker exec linkmind-postgres pg_dump \
  -U "${POSTGRES_USER:-linkmind}" \
  -d "${POSTGRES_DB:-linkmind}" \
  -Fc -f "/tmp/$(basename "$FILE")"
docker cp "linkmind-postgres:/tmp/$(basename "$FILE")" "$FILE"

# 清理 7 天前的备份
find /backup/postgres -type d -mtime +7 -exec rm -rf {} +

echo "=== 备份完成: $FILE ==="
