#\!/bin/bash

CSV_FILE="/Users/jongjinchoi/Desktop/Sheets_data/Claude Code Guide Analytics Dashboard v2.0 - Raw_Events.csv"

echo "=== COMPREHENSIVE CSV ANALYSIS REPORT ==="
echo
echo "1. BASIC INFORMATION"
echo "Total rows (including header): $(wc -l < "$CSV_FILE")"
echo "Total rows (excluding header): $(($(wc -l < "$CSV_FILE") - 1))"

# Get header
echo
echo "Column names:"
head -1 "$CSV_FILE" | tr ',' '\n' | nl -v 0

echo
echo "2. DATE RANGE ANALYSIS"
echo "First 5 timestamps:"
tail -n +2 "$CSV_FILE" | head -5 | cut -d',' -f1

echo
echo "Last 5 timestamps:"
tail -5 "$CSV_FILE" | cut -d',' -f1

echo
echo "Different date formats found:"
echo "Standard format (YYYY-MM-DD):"
tail -n +2 "$CSV_FILE" | cut -d',' -f1 | grep -E '^[0-9]{4}-[0-9]{2}-[0-9]{2}' | head -3

echo
echo "Korean format (YYYY. M. D):"
tail -n +2 "$CSV_FILE" | cut -d',' -f1 | grep -E '^[0-9]{4}\.' | head -3

echo
echo "3. EVENT TYPES DISTRIBUTION"
echo "Event categories count:"
tail -n +2 "$CSV_FILE" | cut -d',' -f2 | sort | uniq -c | sort -nr

echo
echo "Event names count (top 10):"
tail -n +2 "$CSV_FILE" | cut -d',' -f3 | sort | uniq -c | sort -nr | head -10

echo
echo "4. COLUMN VERIFICATION"
echo "Column J (index 9) content samples:"
tail -n +2 "$CSV_FILE" | cut -d',' -f10 | grep -v '^$' | head -5

echo
echo "Column K (index 10) content samples:"
tail -n +2 "$CSV_FILE" | cut -d',' -f11 | grep -v '^$' | head -5

echo
echo "Column O (index 14) content samples:"
tail -n +2 "$CSV_FILE" | cut -d',' -f15 | grep -v '^$' | head -5

echo
echo "5. DATA QUALITY CHECKS"
echo "Lines with potential comma issues (more than 26 fields):"
awk -F',' 'NF > 26 {print NR, NF}' "$CSV_FILE" | head -10

echo
echo "Empty User_ID fields:"
tail -n +2 "$CSV_FILE" | awk -F',' '$4 == "" {print NR}'  | head -5

echo
echo "Device categories:"
tail -n +2 "$CSV_FILE" | cut -d',' -f18 | sort | uniq -c | sort -nr

echo
echo "Browsers:"
tail -n +2 "$CSV_FILE" | cut -d',' -f20 | sort | uniq -c | sort -nr

echo
echo "Guide step completed events:"
tail -n +2 "$CSV_FILE" | grep ',guide,step_completed,' | wc -l

echo
echo "Guide started events:"
tail -n +2 "$CSV_FILE" | grep ',guide,guide_started,' | wc -l

echo
echo "Guide completed events:"
tail -n +2 "$CSV_FILE" | grep ',guide,guide_completed,' | wc -l

