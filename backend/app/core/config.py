from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_DIR = Path(__file__).resolve().parents[3]
ENV_FILE = ROOT_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, env_file_encoding="utf-8", extra="ignore")

    app_name: str = Field(default="ULDA Backend", alias="APP_NAME")
    api_prefix: str = Field(default="/api", alias="API_PREFIX")
    database_url: str = Field(alias="DATABASE_URL")
    jwt_secret_key: str = Field(alias="JWT_SECRET_KEY")
    jwt_refresh_secret_key: str = Field(alias="JWT_REFRESH_SECRET_KEY")
    access_token_expire_minutes: int = Field(default=15, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_expire_days: int = Field(default=7, alias="REFRESH_TOKEN_EXPIRE_DAYS")
    frontend_origin: str = Field(default="http://127.0.0.1:5173", alias="FRONTEND_ORIGIN")
    frontend_origin_localhost: str = Field(default="http://localhost:5173", alias="FRONTEND_ORIGIN_LOCALHOST")
    cookie_secure: bool = Field(default=False, alias="COOKIE_SECURE")
    cookie_samesite: str = Field(default="lax", alias="COOKIE_SAMESITE")
    cookie_domain: str | None = Field(default=None, alias="COOKIE_DOMAIN")
    refresh_cookie_name: str = "ulda_refresh_token"
    jwt_algorithm: str = "HS256"
    upload_storage_dir: str = Field(default="storage/uploads", alias="UPLOAD_STORAGE_DIR")
    chroma_host: str = Field(default="127.0.0.1", alias="CHROMA_HOST")
    chroma_port: int = Field(default=8001, alias="CHROMA_PORT")
    chroma_collection_prefix: str = Field(default="ulda", alias="CHROMA_COLLECTION_PREFIX")
    llm_provider: str = Field(default="xai", alias="LLM_PROVIDER")
    llm_api_key: str | None = Field(default=None, alias="LLM_API_KEY")
    llm_model: str = Field(default="grok-3-mini", alias="LLM_MODEL")
    llm_base_url: str | None = Field(default=None, alias="LLM_BASE_URL")
    llm_timeout_seconds: float = Field(default=60.0, alias="LLM_TIMEOUT_SECONDS")
    llm_temperature: float = Field(default=0.2, alias="LLM_TEMPERATURE")
    retrieval_candidate_limit: int = Field(default=8, alias="RETRIEVAL_CANDIDATE_LIMIT")
    retrieval_context_limit: int = Field(default=5, alias="RETRIEVAL_CONTEXT_LIMIT")
    retrieval_score_threshold: float = Field(default=0.2, alias="RETRIEVAL_SCORE_THRESHOLD")
    retrieval_max_chunks_per_document: int = Field(default=2, alias="RETRIEVAL_MAX_CHUNKS_PER_DOCUMENT")
    retrieval_dedup_similarity: float = Field(default=0.92, alias="RETRIEVAL_DEDUP_SIMILARITY")
    conversation_history_limit: int = Field(default=8, alias="CONVERSATION_HISTORY_LIMIT")
    citation_excerpt_chars: int = Field(default=240, alias="CITATION_EXCERPT_CHARS")
    assistant_system_prompt: str = Field(
        default=(
            "You are ULDA, an enterprise data assistant. Use indexed documents as your primary context, "
            "but answer like a capable AI assistant: explain, summarize, infer, reorganize, and help the user "
            "work with the material. Prefer grounded answers when the documents are relevant, cite the relevant "
            "sources when you use them, and if the documents are incomplete, you may still answer helpfully from "
            "general knowledge without pretending the files said something they did not."
        ),
        alias="ASSISTANT_SYSTEM_PROMPT",
    )

    @property
    def upload_storage_path(self) -> Path:
        return Path(self.upload_storage_dir).resolve()

    @property
    def allowed_frontend_origins(self) -> list[str]:
        origins = [self.frontend_origin, self.frontend_origin_localhost]
        return list(dict.fromkeys(origin.strip() for origin in origins if origin.strip()))

    @property
    def llm_effective_base_url(self) -> str | None:
        if self.llm_base_url:
            return self.llm_base_url.strip()

        provider = self.llm_provider.strip().lower()
        provider_defaults = {
            "xai": "https://api.x.ai/v1",
            "openai": "https://api.openai.com/v1",
            "groq": "https://api.groq.com/openai/v1",
            "openrouter": "https://openrouter.ai/api/v1",
        }
        return provider_defaults.get(provider)

    @property
    def llm_enabled(self) -> bool:
        return bool(self.llm_api_key and self.llm_model.strip())

    @property
    def llm_provider_label(self) -> str:
        provider = self.llm_provider.strip().lower()
        labels = {
            "xai": "xAI Grok",
            "openai": "OpenAI",
            "groq": "Groq",
            "openrouter": "OpenRouter",
        }
        return labels.get(provider, provider.upper() if provider else "LLM")


settings = Settings()
