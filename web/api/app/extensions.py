from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from .models import Base
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./complaints.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # required for SQLite + Flask
    echo=False   # set True to see SQL queries during dev
)

SessionFactory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
db_session = scoped_session(SessionFactory)


def init_db():
    """Create all tables. Call once at app startup."""
    Base.metadata.create_all(bind=engine)


def get_session():
    """Dependency-style helper for routes."""
    session = db_session()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.remove()