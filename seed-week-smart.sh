#!/bin/bash
# seed-week-smart.sh
# -------------------------------------------------------------
# USAGE INSTRUCTIONS:
# -------------------------------------------------------------
# This script auto-populates the last 7 days of wellness entries
# (mood and screen time) for the most recently registered user
# in your SQLite database (wellness.db).
#
# WHEN TO USE:
# - Use this script whenever you want to quickly seed test data
#   for dashboard development, demo, or debugging.
# - It is safe to run multiple times; it will skip days that
#   already have entries for the latest user.
#
# HOW TO RUN:
#   bash seed-week-smart.sh
#
# WHAT IT DOES:
# - Detects the latest user in the users table
# - Inserts 7 days of entries (mood + screen time) for that user
# - Prints debug output for each step
# -------------------------------------------------------------

DB=wellness.db

echo "[DEBUG] Script started."
echo "[DEBUG] Checking for database file: $DB"
if [ ! -f "$DB" ]; then
  echo "[ERROR] Database file $DB not found!"
  exit 1
fi
echo "[DEBUG] Database file found."

echo "[DEBUG] Querying for latest userId..."
USER_ID=$(sqlite3 $DB "SELECT id FROM users ORDER BY id DESC LIMIT 1;")
echo "[DEBUG] USER_ID result: $USER_ID"
if [ -z "$USER_ID" ]; then
  echo "[ERROR] No users found in users table."
  exit 1
fi
echo "[DEBUG] Using userId: $USER_ID"

MOODS=(6 7 5 8 7 6 9)
TIMES=(210 252 300 150 180 288 132)

for i in {0..6}
do
  echo "[DEBUG] Loop index: $i"
  DAYS_AGO=$((6 - i))
  ENTRY_DATE=$(date -v -${DAYS_AGO}d '+%Y-%m-%d')
  echo "[DEBUG] ENTRY_DATE: $ENTRY_DATE"
  MOOD=${MOODS[$i]}
  TIME=${TIMES[$i]}
  echo "[DEBUG] MOOD: $MOOD, TIME: $TIME"
  echo "[DEBUG] Checking entry for userId $USER_ID on $ENTRY_DATE..."
  EXISTS=$(sqlite3 $DB "SELECT id FROM entries WHERE user_id = $USER_ID AND entry_date = '$ENTRY_DATE';")
  echo "[DEBUG] EXISTS result: $EXISTS"
  if [ -z "$EXISTS" ]; then
    SQL="INSERT INTO entries (user_id, mood, screen_time_in_minutes, entry_date) VALUES ($USER_ID, $MOOD, $TIME, '$ENTRY_DATE');"
    echo "[DEBUG] Running SQL: $SQL"
    sqlite3 $DB "$SQL"
    if [ $? -eq 0 ]; then
      echo "Inserted entry for $ENTRY_DATE"
    else
      echo "[ERROR] Failed to insert entry for $ENTRY_DATE"
    fi
  else
    echo "Entry already exists for $ENTRY_DATE, skipping."
  fi
done
echo "[DEBUG] Script finished."
