
#!/bin/bash
# clear_entries.sh
# -------------------------------------------------------------
# USAGE INSTRUCTIONS:
# -------------------------------------------------------------
# This script will DELETE ALL DATA from all major tables in
# your SQLite database (wellness.db): users, entries, reflections,
# user_goals, daily_entries.
#
# WHEN TO USE:
# - Use this script when you want to reset your database to a
#   blank state for testing, development, or before a new demo.
# - WARNING: This action is irreversible! All data will be lost.
#
# HOW TO RUN:
#   bash clear_entries.sh
#
# WHAT IT DOES:
# - Checks for the database file
# - Deletes all rows from key tables
# - Prints a confirmation message
# -------------------------------------------------------------
DB_FILE="wellness.db"

if [ ! -f "$DB_FILE" ]; then
  echo "Database file '$DB_FILE' does not exist."
  exit 1
fi

sqlite3 $DB_FILE <<EOF
DELETE FROM users;
DELETE FROM entries;
DELETE FROM reflections;
DELETE FROM user_goals;
DELETE FROM daily_entries;
EOF

echo "All entries have been cleared from the database."