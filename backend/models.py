from sqlalchemy import Column, Integer, String, Float, DateTime
from .db import Base

class MarketData(Base):
    __tablename__ = 'market_data'
    symbol = Column(String, primary_key=True, index=True)
    date = Column(DateTime, primary_key=True)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    volume = Column(Float)

class AssetAnalysis(Base):
    __tablename__ = 'asset_analysis'
    asset = Column(String, primary_key=True, index=True)
    risk = Column(String)
    stability = Column(String)
    trend = Column(String)
    returns = Column(Float)
    yearly_return = Column(Float)
    volatility = Column(Float)
    average_price = Column(Float)
    latest_price = Column(Float)
    anomaly_ratio = Column(Float)
    stars = Column(Integer)