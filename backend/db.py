import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///./investment_risk.db')
engine = None
SessionLocal = None
Base = declarative_base()

def init_db():
    global engine, SessionLocal
    try:
        connect_args = {'check_same_thread': False, 'timeout': 15} if 'sqlite' in DATABASE_URL else {}
        engine = create_engine(DATABASE_URL, connect_args=connect_args)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        from . import models
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