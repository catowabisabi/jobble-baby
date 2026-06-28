import sqlite3
conn = sqlite3.connect('.hermes/autoloop/progress.db')
c = conn.cursor()
c.execute("""
    INSERT INTO todos (title, status, priority, created_at)
    VALUES (?, ?, ?, datetime('now'))
""", ('Bug: indoor-air-navigator roomScores not persisted (updateRoomScore missing safeSetItem)', 'new', 1))
conn.commit()
new_id = c.lastrowid
print(f'Created TODO #{new_id}')
conn.close()
