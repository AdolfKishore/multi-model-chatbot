
import asyncio
import os
import re
import time
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from groq import Groq
from pydantic import BaseModel, Field

from database import (
    initialize_database,
    save_model_result,
    get_model_results,
    get_users,
    get_user,
    create_user,
    update_user,
    delete_user,
)

load_dotenv()

MODEL_NAME = "gemini-3.8-flash"
GROQ_MODEL_NAME = "openai/gpt-oss-120b"

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    yield


app = FastAPI(
    title="Multi-Model AI Chatbot",
    description="AI model comparison, history, and user management API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=10000)


class ChatModelResult(BaseModel):
    provider: str
    model: str
    response: str
    response_time_seconds: float


class ModelError(BaseModel):
    error: str


class ModelComparisonResponse(BaseModel):
    prompt: str
    comparison: dict[str, ChatModelResult | ModelError]


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=5, max_length=254)
    age: int = Field(ge=1, le=120)


class UserUpdate(UserCreate):
    pass


def clean_user(user):
    name = user.name.strip()
    email = user.email.strip().lower()

    if not name:
        raise HTTPException(status_code=422, detail="Name is required.")

    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise HTTPException(status_code=422, detail="Enter a valid email.")

    return name, email


def record_result(prompt, provider, model, response, elapsed, status):
    try:
        save_model_result(
            prompt=prompt,
            provider=provider,
            model=model,
            response=response,
            response_time_seconds=round(elapsed, 3),
            status=status,
        )
    except Exception as exc:
        # A database write failure should not erase the AI response.
        print(f"Database history save failed: {exc}")


def error_result(prompt, provider, model, message, elapsed=0):
    record_result(prompt, provider, model, message, elapsed, "error")
    return {"error": message}


def call_gemini(prompt):
    if client is None:
        raise RuntimeError("GEMINI_API_KEY is missing.")

    response = client.interactions.create(
        model=MODEL_NAME,
        input=prompt,
        generation_config={"thinking_level": "low"},
    )
    return response.output_text or ""


def call_groq(prompt):
    if groq_client is None:
        raise RuntimeError("GROQ_API_KEY is missing.")

    response = groq_client.chat.completions.create(
        model=GROQ_MODEL_NAME,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content or ""


def single_model_result(prompt, provider, model, call):
    start = time.perf_counter()

    try:
        answer = call(prompt)
        elapsed = time.perf_counter() - start
        record_result(prompt, provider, model, answer, elapsed, "success")
        return {
            "prompt": prompt,
            "provider": provider,
            "model": model,
            "response": answer,
            "response_time_seconds": round(elapsed, 3),
        }
    except Exception as exc:
        elapsed = time.perf_counter() - start
        message = f"{provider} API request failed: {exc}"
        record_result(prompt, provider, model, message, elapsed, "error")
        raise HTTPException(status_code=502, detail=message) from exc


@app.get("/")
def home():
    return {"message": "Multi-Model AI Chatbot API", "status": "running"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/chat")
def chat(request: ChatRequest):
    return single_model_result(
        request.prompt, "Google Gemini", MODEL_NAME, call_gemini
    )


@app.post("/chat-groq")
def chat_groq(request: ChatRequest):
    return single_model_result(
        request.prompt, "Groq", GROQ_MODEL_NAME, call_groq
    )


async def compare_one(prompt, provider, model, call, timeout):
    start = time.perf_counter()

    try:
        answer = await asyncio.wait_for(
            asyncio.to_thread(call, prompt),
            timeout=timeout,
        )
        elapsed = time.perf_counter() - start
        record_result(prompt, provider, model, answer, elapsed, "success")
        return {
            "provider": provider,
            "model": model,
            "response": answer,
            "response_time_seconds": round(elapsed, 3),
        }
    except asyncio.TimeoutError:
        elapsed = time.perf_counter() - start
        message = f"{provider} request timed out after {timeout} seconds."
        record_result(prompt, provider, model, message, elapsed, "error")
        return {"error": message}
    except Exception as exc:
        elapsed = time.perf_counter() - start
        message = f"{provider} API request failed: {exc}"
        record_result(prompt, provider, model, message, elapsed, "error")
        return {"error": message}


@app.post("/compare", response_model=ModelComparisonResponse)
async def compare_models(request: ChatRequest):
    # Run both providers concurrently with separate deadlines.
    gemini_task = compare_one(
        request.prompt, "Google Gemini", MODEL_NAME, call_gemini, 15
    )
    groq_task = compare_one(
        request.prompt, "Groq", GROQ_MODEL_NAME, call_groq, 12
    )

    gemini_result, groq_result = await asyncio.gather(
        gemini_task, groq_task
    )

    return {
        "prompt": request.prompt,
        "comparison": {
            "gemini": gemini_result,
            "groq": groq_result,
        },
    }


@app.get("/history")
def history(limit: int = Query(default=50, ge=1, le=200)):
    records = get_model_results(limit)
    return {"count": len(records), "history": records}


@app.get("/users")
def list_users():
    return {"users": get_users()}


@app.get("/users/{user_id}")
def read_user(user_id: int):
    user = get_user(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    return user


@app.post("/users", status_code=201)
def add_user(user: UserCreate):
    import sqlite3

    name, email = clean_user(user)
    try:
        return create_user(name, email, user.age)
    except sqlite3.IntegrityError as exc:
        raise HTTPException(
            status_code=409,
            detail="That email address is already registered.",
        ) from exc


@app.put("/users/{user_id}")
def edit_user(user_id: int, user: UserUpdate):
    import sqlite3

    if get_user(user_id) is None:
        raise HTTPException(status_code=404, detail="User not found.")

    name, email = clean_user(user)
    try:
        return update_user(user_id, name, email, user.age)
    except sqlite3.IntegrityError as exc:
        raise HTTPException(
            status_code=409,
            detail="That email address is already registered.",
        ) from exc


@app.delete("/users/{user_id}")
def remove_user(user_id: int):
    if not delete_user(user_id):
        raise HTTPException(status_code=404, detail="User not found.")
    return {"message": "User deleted successfully.", "id": user_id}
