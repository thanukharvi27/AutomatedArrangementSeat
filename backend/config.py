import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "examease-super-secret-key-college-pbl-2026")
    MYSQL_USER = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
    MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_PORT = os.getenv("MYSQL_PORT", "3306")
    MYSQL_DB = os.getenv("MYSQL_DB", "examease")
    
    USE_SQLITE = os.getenv("USE_SQLITE", "true").lower() in ("true", "1", "yes")
    
    if USE_SQLITE:
        SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///examease.db")
    else:
        pwd_part = f":{MYSQL_PASSWORD}" if MYSQL_PASSWORD else ""
        SQLALCHEMY_DATABASE_URI = os.getenv(
            "DATABASE_URL",
            f"mysql+pymysql://{MYSQL_USER}{pwd_part}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}?charset=utf8mb4"
        )
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_recycle": 280,
        "pool_pre_ping": True,
    }

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "examease-jwt-secret-pbl-token-key-2026")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=int(os.getenv("JWT_ACCESS_HOURS", 8)))
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=int(os.getenv("JWT_REFRESH_DAYS", 30)))
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")

class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
