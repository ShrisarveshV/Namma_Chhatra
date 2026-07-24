from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./nammachhatra.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def migrate_db():
    """Safely add new columns to existing tables without dropping data."""
    new_columns = [
        ("students", "aadhaar", "VARCHAR"),
        ("students", "admission_number", "VARCHAR"),
        ("students", "joining_date", "DATE"),
        ("students", "teacher_remarks", "VARCHAR"),
        ("students", "dropout_risk_score", "FLOAT"),
        ("students", "dropout_risk_level", "VARCHAR"),
        ("students", "risk_reasons", "VARCHAR"),
        ("students", "last_evaluated_at", "DATETIME"),
        ("students", "commute_distance_km", "FLOAT"),
        ("students", "income_bracket", "VARCHAR"),
        ("students", "grade_drop_pct", "FLOAT"),
        ("users", "dob", "DATE"),
        ("users", "phone", "VARCHAR"),
        ("users", "profile_photo", "VARCHAR"),
        ("attendance", "leave_type", "VARCHAR"),
    ]
    with engine.connect() as conn:
        for table, col, typ in new_columns:
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {typ}"))
                conn.commit()
            except Exception:
                pass  # Column already exists — safe to ignore
