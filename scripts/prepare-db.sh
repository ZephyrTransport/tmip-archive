#!/bin/bash
set -euo pipefail # sane bash settings

DB=tmip.db

# start with clean db
rm -f $DB $DB.zst

# import raw CSVs into sqlite
for each in message_attachments webinar_attachments; do
    echo $each
    sqlite-utils insert $DB $each $each.csv --csv
done

# webinars needed some URL fixes
sqlite-utils insert $DB webinars fixed-webinars.csv --csv

# messages.csv was pre-processed with "node create-threads.js"
sqlite-utils insert $DB messages threads.csv --csv

# toolbox has non-UTF8 characters
sqlite-utils insert $DB toolbox toolbox.csv --csv --encoding=latin-1

# insane max compression using zstandard
zstd -19 $DB

