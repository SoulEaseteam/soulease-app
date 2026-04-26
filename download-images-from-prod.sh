#!/bin/bash
# ดาวน์โหลดรูปทั้งหมดที่ใช้ในระบบจาก sunred.vip (production)

cd "$(dirname "$0")"
echo "=== ดาวน์โหลดรูปจาก sunred.vip ==="

# รวมทุก image path ที่อ้างถึงในโค้ด
imgs=$(grep -hoE '"/images/[^"]+"' src/data/*.ts src/data/*.tsx 2>/dev/null | sort -u | tr -d '"')

total=$(echo "$imgs" | wc -l | tr -d ' ')
ok=0
fail=0
skip=0

echo "พบ $total รูปที่ต้องการ"
echo ""

while IFS= read -r img; do
  [ -z "$img" ] && continue
  outpath="public$img"
  outdir=$(dirname "$outpath")
  mkdir -p "$outdir"
  if [ -f "$outpath" ] && [ -s "$outpath" ]; then
    skip=$((skip+1))
    continue
  fi
  # curl auto-handles UTF-8 in URLs but we'll url-encode just in case
  if curl -fsSL --max-time 30 "https://sunred.vip$img" -o "$outpath" 2>/dev/null; then
    ok=$((ok+1))
    echo "✓ $img"
  else
    fail=$((fail+1))
    rm -f "$outpath"
    echo "✗ $img"
  fi
done <<< "$imgs"

echo ""
echo "=== สรุป ==="
echo "ดาวน์โหลดสำเร็จ: $ok"
echo "ข้าม (มีอยู่แล้ว): $skip"
echo "ล้มเหลว: $fail"
