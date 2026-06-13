import sqlite3
conn = sqlite3.connect('.hermes/autoloop/progress.db')
c = conn.cursor()
title = 'Fix hardcoded i18n strings in interoceptive.tsx + reflex-visual-motor.tsx'
c.execute("INSERT INTO todos (title, status, priority, from_idea_id) VALUES (?, 'new', 1, NULL)", 
    (title,))
conn.commit()
c.execute("SELECT MAX(id) FROM todos")
new_id = c.fetchone()[0]
print(f'New todo id: {new_id}')
conn.close()