"""Additive, idempotent schema upgrades for databases created before a column existed.

db.create_all() only creates missing tables, never missing columns, so new nullable
columns are added here with ALTER TABLE. Existing rows are untouched.
"""
from sqlalchemy import inspect, text
from app.extensions import db

# (table, column, SQL type) - nullable columns only, so old rows stay valid
ADDED_COLUMNS = [
    ("seating_plans", "config", "TEXT"),
]


def ensure_schema():
    inspector = inspect(db.engine)
    tables = set(inspector.get_table_names())
    added = []
    for table, column, col_type in ADDED_COLUMNS:
        if table not in tables:
            continue
        if column not in {c["name"] for c in inspector.get_columns(table)}:
            with db.engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))
            added.append(f"{table}.{column}")
    return added
