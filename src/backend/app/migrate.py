import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.database import engine, Base
from sqlalchemy import text
from app.models.schema import Team, Lead, InAppNotification

print("Initializing metadata and creating tables...")
# Recreate/create new tables (teams, leads, in_app_notifications)
Base.metadata.create_all(bind=engine)

print("Altering existing tables if needed...")
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN team_id CHAR(32) REFERENCES teams(id);"))
        conn.commit()
        print("Successfully added team_id column to users table.")
    except Exception as e:
        print(f"team_id column might already exist or skipped: {e}")

print("Migration check complete.")
