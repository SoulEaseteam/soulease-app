#!/usr/bin/env bash
set -euo pipefail

# ----------------------------
# Options
# ----------------------------
DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then DRY_RUN=true; fi

ROOT_DIR="$(pwd)"
LOG_FILE="$ROOT_DIR/cleanup-duplicates.log"
> "$LOG_FILE"

echo "== Cleanup duplicates (DRY_RUN=$DRY_RUN) ==" | tee -a "$LOG_FILE"

# ----------------------------
# Mapping: old -> new (relative to project root)
# ปรับแก้แผนที่ได้ตามความจริงของโปรเจกต์
# ----------------------------
declare -A MAP
MAP["src/utils/therapistStatus.ts"]="src/utils/getTherapistStatus.ts"
MAP["src/utils/status.ts"]="src/utils/getTherapistStatus.ts"
MAP["src/utils/updateNextAvailableForAll.ts"]="src/utils/calculateNextAvailable.ts"

# โฟลเดอร์ที่ไม่ต้องค้นหา
EXCLUDES=(-path "./node_modules/*" -o -path "./dist/*" -o -path "./.vercel/*" -o -path "./.git/*")

# util: แทนที่ segment 'utils/xxx' -> 'utils/yyy' ทั้งรูปแบบ alias (@/utils/xxx) และ relative
replace_imports() {
  local old="$1"   # e.g. src/utils/status.ts
  local new="$2"   # e.g. src/utils/getTherapistStatus.ts

  local oldBase="${old##src/}"   # utils/status.ts
  local newBase="${new##src/}"   # utils/getTherapistStatus.ts

  local oldSeg="${oldBase%.ts}"  # utils/status
  local newSeg="${newBase%.ts}"  # utils/getTherapistStatus

  echo ">> Replace imports: $oldSeg -> $newSeg" | tee -a "$LOG_FILE"

  # หาไฟล์ที่อ้างถึง old
  mapfile -t FILES < <(find . \( ! \( "${EXCLUDES[@]}" \) \) -type f \
     -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | \
     xargs grep -IlE "(from ['\"][^'\"]*${oldSeg}['\"]|import\(['\"][^'\"]*${oldSeg}['\"]\))" || true)

  if [[ ${#FILES[@]} -eq 0 ]]; then
    echo "   - no imports found" | tee -a "$LOG_FILE"
    return
  fi

  for f in "${FILES[@]}"; do
    echo "   - $f" | tee -a "$LOG_FILE"
    if [[ "$DRY_RUN" == "false" ]]; then
      # แทนที่ทุกแบบ: "@/utils/status" "../utils/status" "./utils/status" "utils/status"
      perl -i -pe "s{([\"'])@?(\.\./|\./)?utils/status\\1}{\$1@/utils/getTherapistStatus\$1}g" "$f"
      perl -i -pe "s{([\"'])@?(\.\./|\./)?$oldSeg\\1}{\$1@/$newSeg\$1}g" "$f"
      # fallback: เปลี่ยนเฉพาะ segment 'utils/status' -> 'utils/getTherapistStatus'
      perl -i -pe "s{utils/status\\b}{utils/getTherapistStatus}g" "$f"
      perl -i -pe "s{$oldSeg\\b}{$newSeg}g" "$f"
    fi
  done
}

# ----------------------------
# Main
# ----------------------------
# แนะนำให้มี git เพื่อย้อนกลับได้
if command -v git >/dev/null 2>&1; then
  echo "Creating safety commit..." | tee -a "$LOG_FILE"
  git add -A >/dev/null 2>&1 || true
  git commit -m "chore: pre-cleanup snapshot" >/dev/null 2>&1 || true
fi

for old in "${!MAP[@]}"; do
  new="${MAP[$old]}"

  if [[ ! -f "$old" ]]; then
    echo "-- skip (missing): $old" | tee -a "$LOG_FILE"
    continue
  fi
  if [[ ! -f "$new" ]]; then
    echo "!! target not found for $old -> $new" | tee -a "$LOG_FILE"
    continue
  fi

  replace_imports "$old" "$new"

  if [[ "$DRY_RUN" == "false" ]]; then
    echo "Deleting: $old" | tee -a "$LOG_FILE"
    rm -f "$old"
  else
    echo "(dry-run) would delete: $old" | tee -a "$LOG_FILE"
  fi
done

echo "== Done. Log: $LOG_FILE ==" | tee -a "$LOG_FILE"
