#\!/bin/bash

CSV_FILE="/Users/jongjinchoi/Desktop/Sheets_data/Claude Code Guide Analytics Dashboard v2.0 - Raw_Events.csv"

echo "=== DETAILED DATA QUALITY ANALYSIS ==="
echo

echo "1. ACTION_TARGET LINE BREAK ANALYSIS"
echo "Checking column 15 (Action_Target) for multiline content:"
# Look for entries with newlines in Action_Target field
tail -n +2 "$CSV_FILE" | awk -F',' '{
    if (NF > 14 && index($15, "\n") > 0) {
        print "Row " NR ": Found newline in Action_Target"
    }
}' | head -10

echo
echo "Sample Action_Target values:"
tail -n +2 "$CSV_FILE" | cut -d',' -f15 | grep -v '^$' | sort | uniq -c | sort -nr | head -20

echo
echo "2. DATE FORMAT INCONSISTENCIES"
echo "Rows with standard format (2025-07-18):"
tail -n +2 "$CSV_FILE" | grep '^2025-07-' | wc -l

echo "Rows with Korean format (2025. 7.):"
tail -n +2 "$CSV_FILE" | grep '^2025\. 7\.' | wc -l

echo
echo "3. GUIDE STEP ANALYSIS"
echo "All unique Guide Step Numbers:"
tail -n +2 "$CSV_FILE" | cut -d',' -f10 | grep -v '^$' | sort -n | uniq -c

echo
echo "All unique Guide Step Names:"
tail -n +2 "$CSV_FILE" | cut -d',' -f11 | grep -v '^$' | sort | uniq -c

echo
echo "4. SUSPICIOUS DATA PATTERNS"
echo "Checking for numeric values in Event_Category:"
tail -n +2 "$CSV_FILE" | cut -d',' -f2 | grep -E '^[0-9]+$' | head -5

echo
echo "Checking for very long Action_Target values:"
tail -n +2 "$CSV_FILE" | awk -F',' 'length($15) > 50 {print NR, length($15), substr($15, 1, 50) "..."}' | head -5

echo
echo "5. EMPTY CELLS IN CRITICAL COLUMNS"
echo "Rows with empty Event_Category:"
tail -n +2 "$CSV_FILE" | awk -F',' '$2 == "" {print NR}' | head -5

echo
echo "Rows with empty Event_Name:"
tail -n +2 "$CSV_FILE" | awk -F',' '$3 == "" {print NR}' | head -5

echo
echo "6. SESSION AND USER PATTERNS"
echo "Top 5 users by event count:"
tail -n +2 "$CSV_FILE" | cut -d',' -f4 | sort | uniq -c | sort -nr | head -5

echo
echo "7. ERROR ANALYSIS"
echo "Error types distribution:"
tail -n +2 "$CSV_FILE" | awk -F',' '$2 == "error" {print $22}' | sort | uniq -c

echo
echo "8. SPECIAL CHARACTERS IN ACTION_TARGET"
echo "Checking for problematic characters:"
tail -n +2 "$CSV_FILE" | cut -d',' -f15 | grep -E '["|;]' | head -5

