import sqlite3
from datetime import datetime
conn = sqlite3.connect('.hermes/autoloop/progress.db')
cur = conn.cursor()
cur.execute("""INSERT INTO todos (title, description, status, priority, created_at) VALUES (?, ?, ?, ?, ?)""",
    ('Fix accessibility labels - asymmetric-growth, circadian, eight-month-storm, jaundice-threshold (10 elements)',
     'Add accessibilityLabel to TouchableOpacity elements at specific lines in 4 files as reported by pre-submission-audit.js',
     'pending', 2, datetime.now().isoformat()))
new_id = cur.lastrowid
conn.commit()
print(f'Created todo #{new_id}')
conn.close()