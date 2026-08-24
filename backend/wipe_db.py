from sqlalchemy import create_engine, text

engine = create_engine('postgresql://postgres:saki007@localhost:5432/postgres')
with engine.connect() as conn:
    conn.execute(text('TRUNCATE TABLE portfolio_assets, portfolio, users CASCADE;'))
    conn.commit()
    print('Successfully wiped all users, portfolios, and transactions.')
