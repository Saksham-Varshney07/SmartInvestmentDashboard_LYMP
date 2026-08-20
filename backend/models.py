from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, BigInteger, Numeric, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from db import Base

# Postgres: asset_prices (Replaces old MarketData)
class AssetPrice(Base):
    __tablename__ = 'asset_prices'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ticker = Column(String, index=True, nullable=False)
    date = Column(DateTime, nullable=False)
    open = Column(Numeric(18, 8))
    high = Column(Numeric(18, 8))
    low = Column(Numeric(18, 8))
    close = Column(Numeric(18, 8))
    volume = Column(BigInteger)

# Postgres: risk_scores (Replaces old AssetAnalysis)
class RiskScore(Base):
    __tablename__ = 'risk_scores'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ticker = Column(String, index=True, nullable=False)
    risk_level = Column(String)
    stability = Column(String)
    trend = Column(String)
    returns = Column(Float)
    yearly_return = Column(Float)
    volatility = Column(Float)
    average_price = Column(Float)
    latest_price = Column(Float)
    anomaly_ratio = Column(Float)
    stars = Column(Integer)
    created_at = Column(DateTime, default=func.now())

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String)
    risk_profile = Column(String)
    investment_horizon = Column(String)
    created_at = Column(DateTime, default=func.now())
    
    portfolios = relationship("Portfolio", back_populates="user")

class Portfolio(Base):
    __tablename__ = 'portfolio'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    portfolio_name = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'))
    created_at = Column(DateTime, default=func.now())
    
    user = relationship("User", back_populates="portfolios")
    assets = relationship("PortfolioAsset", back_populates="portfolio")

class PortfolioAsset(Base):
    __tablename__ = 'portfolio_assets'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    portfolio_id = Column(Integer, ForeignKey('portfolio.id'))
    ticker = Column(String, index=True)
    shares = Column(Float)
    purchase_price = Column(Float)
    purchase_date = Column(DateTime, default=func.now())

    portfolio = relationship("Portfolio", back_populates="assets")