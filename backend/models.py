from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
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

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    
    transactions = relationship("PortfolioTransaction", back_populates="user")

class PortfolioTransaction(Base):
    __tablename__ = 'portfolio_transactions'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    symbol = Column(String, index=True)
    transaction_type = Column(String) # 'BUY' or 'SELL'
    shares = Column(Float)
    price_at_purchase = Column(Float)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="transactions")