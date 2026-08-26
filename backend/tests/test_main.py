import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.main import app
from app.core.database import Base, get_db
from app.core.seeds import init_db_seeds
from app.core.config import settings

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest_asyncio.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()

@pytest_asyncio.fixture
async def db_session(test_engine):
    async_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        await init_db_seeds(session)
        yield session

@pytest_asyncio.fixture
async def client(db_session):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

@pytest.mark.asyncio
async def test_admin_login(client):
    response = await client.post(
        f"{settings.API_V1_STR}/auth/login",
        data={"username": settings.FIRST_ADMIN_EMAIL, "password": settings.FIRST_ADMIN_PASSWORD}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == settings.FIRST_ADMIN_EMAIL
    assert data["user"]["role"] == "admin"

@pytest.mark.asyncio
async def test_admin_creates_user(client):
    # 1. Login Admin
    login_res = await client.post(
        f"{settings.API_V1_STR}/auth/login",
        data={"username": settings.FIRST_ADMIN_EMAIL, "password": settings.FIRST_ADMIN_PASSWORD}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create User
    new_user = {
        "email": "athlete1@fitpulse.com",
        "password": "UserSecure123!",
        "full_name": "Jean Dupont",
        "role": "user"
    }
    create_res = await client.post(f"{settings.API_V1_STR}/users/", json=new_user, headers=headers)
    assert create_res.status_code == 200
    assert create_res.json()["email"] == "athlete1@fitpulse.com"

@pytest.mark.asyncio
async def test_exercises_list(client):
    # Login as Admin to get token
    login_res = await client.post(
        f"{settings.API_V1_STR}/auth/login",
        data={"username": settings.FIRST_ADMIN_EMAIL, "password": settings.FIRST_ADMIN_PASSWORD}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    ex_res = await client.get(f"{settings.API_V1_STR}/exercises/", headers=headers)
    assert ex_res.status_code == 200
    exercises = ex_res.json()
    assert len(exercises) >= 2
    # Verify Pompes diamant present
    ex_names = [e["name"] for e in exercises]
    assert "Pompes Diamant" in ex_names
