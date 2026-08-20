import psycopg2
from db import DATABASE_URL
import urllib.parse

def run_setup():
    print(f"Connecting to {DATABASE_URL}")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()

    print("Checking TimescaleDB extension...")
    try:
        cur.execute("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;")
        print("TimescaleDB extension created or already exists.")
    except Exception as e:
        print("Could not create TimescaleDB extension (maybe missing from Postgres installation):", e)
        # we continue anyway

    print("Creating tables via SQLAlchemy...")
    from db import init_db
    init_db()

    print("Attempting to convert asset_prices to a hypertable...")
    try:
        cur.execute("SELECT create_hypertable('asset_prices', 'date', if_not_exists => TRUE);")
        print("Hypertable created successfully.")
    except Exception as e:
        print("Hypertable note:", e)

    print("Creating stored procedure for portfolio asset purchase with rollback support...")
    stored_proc = """
    CREATE OR REPLACE PROCEDURE purchase_portfolio_asset(
        p_portfolio_id INT,
        p_ticker VARCHAR,
        p_shares FLOAT,
        p_price FLOAT
    )
    LANGUAGE plpgsql
    AS $$
    BEGIN
        -- Insert the asset
        INSERT INTO portfolio_assets (portfolio_id, ticker, shares, purchase_price, purchase_date)
        VALUES (p_portfolio_id, p_ticker, p_shares, p_price, NOW());
        
        -- Artificial check for rollback demonstration (e.g. max shares)
        IF p_shares <= 0 THEN
            RAISE EXCEPTION 'Shares must be greater than zero. Rolling back transaction.';
        END IF;

        -- Implicit COMMIT happens at the end of the procedure unless an exception is raised
    END;
    $$;
    """
    try:
        cur.execute(stored_proc)
        print("Stored procedure created successfully.")
    except Exception as e:
        print("Failed to create stored procedure:", e)

    print("Database setup complete.")
    cur.close()
    conn.close()

if __name__ == "__main__":
    run_setup()
