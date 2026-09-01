import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

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
        Base.metadata.create_all(bind=engine)
        # Test connection
        with engine.connect() as conn:
            pass
        print('PostgreSQL Database connected and tables created successfully.')
    except Exception as e:
        print(f'PostgreSQL connection note: {e}. Falling back to SQLite database for seamless operation.')
        sqlite_url = 'sqlite:///./smart_invest.db'
        engine = create_engine(sqlite_url, connect_args={'check_same_thread': False})
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        import models
        Base.metadata.create_all(bind=engine)
        print('SQLite Database initialized successfully.')

def get_db():
    if SessionLocal is None:
        init_db()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()