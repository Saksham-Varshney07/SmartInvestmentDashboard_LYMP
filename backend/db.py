import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Member 3 Task: Link to PostgreSQL
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://postgres:saki007@localhost:5432/postgres')

engine = None
SessionLocal = None
Base = declarative_base()

def init_db():
    global engine, SessionLocal
    try:
        engine = create_engine(DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        import models
        # Creates tables based on updated models.py
        Base.metadata.create_all(bind=engine)
        print('Database connected and tables created successfully.')
    except Exception as e:
        print(f'Error connecting to database: {e}')

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()