from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    SECRET_KEY: str = "dev-secret-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    REMEMBER_ME_EXPIRE_MINUTES: int = 43200  # 30 days
    OTP_EXPIRE_MINUTES: int = 10

    DATABASE_URL: str = "sqlite:///./laundry.db"
    FRONTEND_ORIGIN: str = "http://localhost:3000"

    PAYSTACK_SECRET_KEY: str = ""
    PAYSTACK_BASE_URL: str = "https://api.paystack.co"

    AT_USERNAME: str = "sandbox"
    AT_API_KEY: str = ""
    AT_SENDER_ID: str = "Nagyees Laundry Service"
    MOCK_MODE: bool = True

    SEED_IT_ADMIN_USERNAME: str = "itadmin"
    SEED_IT_ADMIN_PASSWORD: str = "itadmin123"

    class Config:
        env_file = ".env"

    def paystack_configured(self) -> bool:
        return bool(self.PAYSTACK_SECRET_KEY) and not self.MOCK_MODE

    def sms_configured(self) -> bool:
        return bool(self.AT_API_KEY) and not self.MOCK_MODE


@lru_cache
def get_settings() -> Settings:
    return Settings()
