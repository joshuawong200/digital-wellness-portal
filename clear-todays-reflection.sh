#!/bin/bash
# clear-todays-reflection.sh
# Deletes today's reflection for the latest user in wellness.db

DB="wellness.db"
USER_ID=$(sqlite3 $DB "SELECT id FROM users ORDER BY id DESC LIMIT 1;")
TODAY=$(date '+%Y-%m-%d')

if [ -z "$USER_ID" ]; then
  echo "No users found."
  exit 1
fi

sqlite3 $DB "DELETE FROM reflections WHERE user_id = $USER_ID AND timestamp LIKE '$TODAY%';"
echo "Deleted today's reflection for user $USER_ID."
