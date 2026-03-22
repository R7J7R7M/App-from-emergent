from fastapi import FastAPI, APIRouter, HTTPException, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import random
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ─── Models ────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    name: str
    pin: str  # 4-digit PIN

class UserLogin(BaseModel):
    name: str
    pin: str

class UserOut(BaseModel):
    id: str
    name: str
    total_points: int = 0
    current_streak: int = 0

class TaskCreate(BaseModel):
    name: str
    description: str = ""
    points: int = 1
    task_type: str = "manual"  # manual, timer, wake_check
    duration_minutes: int = 0  # for timer tasks
    icon: str = "star"

class TaskOut(BaseModel):
    id: str
    name: str
    description: str
    points: int
    task_type: str
    duration_minutes: int
    icon: str
    is_default: bool = False

class TaskComplete(BaseModel):
    task_id: str
    duration_seconds: int = 0  # for timer tasks

class CompletionOut(BaseModel):
    id: str
    task_id: str
    task_name: str
    points_earned: int
    completed_at: str
    streak_bonus: bool = False

class RewardCreate(BaseModel):
    name: str
    description: str = ""
    points_cost: int = 10
    emoji: str = "🎁"

class RewardOut(BaseModel):
    id: str
    name: str
    description: str
    points_cost: int
    emoji: str

class GoalCreate(BaseModel):
    title: str
    description: str = ""
    target_points: int = 50
    goal_type: str = "short"  # short or long

class GoalOut(BaseModel):
    id: str
    title: str
    description: str
    target_points: int
    current_points: int = 0
    goal_type: str
    completed: bool = False
    created_at: str

class PhotoUpload(BaseModel):
    image_data: str  # base64
    name: str = "Photo"

class PhotoOut(BaseModel):
    id: str
    name: str
    image_data: str
    created_at: str

class MonitorLogin(BaseModel):
    monitor_pin: str

class SettingsUpdate(BaseModel):
    monitor_pin: Optional[str] = None
    wake_target_hour: Optional[int] = None
    wake_target_minute: Optional[int] = None

# ─── Seed Default Data ──────────────────────────────────────────────────────

DEFAULT_TASKS = [
    {
        "id": "default_walk",
        "name": "20 Min Walk",
        "description": "Take a refreshing 20-minute walk",
        "points": 1,
        "task_type": "timer",
        "duration_minutes": 20,
        "icon": "walk",
        "is_default": True,
    },
    {
        "id": "default_gym",
        "name": "1 Hour Gym",
        "description": "Complete a 1-hour gym session",
        "points": 3,
        "task_type": "timer",
        "duration_minutes": 60,
        "icon": "fitness",
        "is_default": True,
    },
    {
        "id": "default_wake",
        "name": "Wake Before 6",
        "description": "Wake up before 6:00 AM",
        "points": 5,
        "task_type": "wake_check",
        "duration_minutes": 0,
        "icon": "alarm",
        "is_default": True,
    },
    {
        "id": "default_sugar",
        "name": "Zero Sugar Day",
        "description": "No sugar for the entire day",
        "points": 1,
        "task_type": "manual",
        "duration_minutes": 0,
        "icon": "nutrition",
        "is_default": True,
    },
]

DEFAULT_REWARDS = [
    {"id": str(uuid.uuid4()), "name": "A Big Hug", "description": "A warm, loving hug", "points_cost": 10, "emoji": "🤗"},
    {"id": str(uuid.uuid4()), "name": "Favorite Snack", "description": "Your favorite treat", "points_cost": 15, "emoji": "🍫"},
    {"id": str(uuid.uuid4()), "name": "Movie Night", "description": "Pick any movie for date night", "points_cost": 25, "emoji": "🎬"},
    {"id": str(uuid.uuid4()), "name": "Surprise Gift", "description": "A cute little surprise", "points_cost": 30, "emoji": "🎁"},
    {"id": str(uuid.uuid4()), "name": "Spa Day", "description": "Pamper yourself!", "points_cost": 50, "emoji": "💆"},
    {"id": str(uuid.uuid4()), "name": "Shopping Spree", "description": "Mini shopping trip", "points_cost": 75, "emoji": "🛍️"},
    {"id": str(uuid.uuid4()), "name": "Dream Date", "description": "Plan your dream date", "points_cost": 100, "emoji": "💕"},
    {"id": str(uuid.uuid4()), "name": "Weekend Getaway", "description": "A short trip together", "points_cost": 150, "emoji": "✈️"},
]

@app.on_event("startup")
async def seed_data():
    for task in DEFAULT_TASKS:
        existing = await db.tasks.find_one({"id": task["id"]})
        if not existing:
            await db.tasks.insert_one(task)
    existing_reward_count = await db.rewards.count_documents({})
    if existing_reward_count == 0:
        for reward in DEFAULT_REWARDS:
            await db.rewards.insert_one(reward)
    # Ensure settings doc
    settings = await db.settings.find_one({"type": "app_settings"})
    if not settings:
        await db.settings.insert_one({
            "type": "app_settings",
            "monitor_pin": "1234",
            "wake_target_hour": 6,
            "wake_target_minute": 0,
        })
    logger.info("Seed data checked/inserted.")

# ─── Auth ──────────────────────────────────────────────────────────────────

@api_router.post("/auth/register")
async def register(data: UserRegister):
    existing = await db.users.find_one({"name": data.name})
    if existing:
        raise HTTPException(400, "User already exists")
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "name": data.name,
        "pin": data.pin,
        "total_points": 0,
        "current_streak": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    return {"id": user_id, "name": data.name, "total_points": 0, "current_streak": 0}

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"name": data.name, "pin": data.pin}, {"_id": 0})
    if not user:
        raise HTTPException(401, "Invalid name or PIN")
    return {"id": user["id"], "name": user["name"], "total_points": user.get("total_points", 0), "current_streak": user.get("current_streak", 0)}

@api_router.get("/auth/profile/{user_id}")
async def get_profile(user_id: str):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(404, "User not found")
    return {"id": user["id"], "name": user["name"], "total_points": user.get("total_points", 0), "current_streak": user.get("current_streak", 0)}

# ─── Tasks ─────────────────────────────────────────────────────────────────

@api_router.get("/tasks")
async def get_tasks():
    tasks = await db.tasks.find({}, {"_id": 0}).to_list(100)
    return tasks

@api_router.post("/tasks")
async def create_task(data: TaskCreate):
    task_id = str(uuid.uuid4())
    task = {
        "id": task_id,
        "name": data.name,
        "description": data.description,
        "points": data.points,
        "task_type": data.task_type,
        "duration_minutes": data.duration_minutes,
        "icon": data.icon,
        "is_default": False,
    }
    await db.tasks.insert_one(task)
    return {k: v for k, v in task.items() if k != "_id"}

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(404, "Task not found")
    if task.get("is_default"):
        raise HTTPException(400, "Cannot delete default tasks")
    await db.tasks.delete_one({"id": task_id})
    return {"message": "Task deleted"}

# ─── Task Completions ─────────────────────────────────────────────────────

@api_router.post("/tasks/complete/{user_id}")
async def complete_task(user_id: str, data: TaskComplete):
    task = await db.tasks.find_one({"id": data.task_id}, {"_id": 0})
    if not task:
        raise HTTPException(404, "Task not found")

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    existing = await db.completions.find_one({"user_id": user_id, "task_id": data.task_id, "date": today})
    if existing:
        raise HTTPException(400, "Task already completed today")

    # Timer validation for timer tasks
    if task["task_type"] == "timer" and task["duration_minutes"] > 0:
        required_seconds = task["duration_minutes"] * 60
        if data.duration_seconds < required_seconds * 0.95:  # Allow 5% tolerance
            raise HTTPException(400, f"Timer not completed. Need {required_seconds}s, got {data.duration_seconds}s")

    # Calculate streak
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(404, "User not found")

    streak = await calculate_streak(user_id)
    streak_bonus = streak >= 4
    points = task["points"] * 2 if streak_bonus else task["points"]

    completion = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "task_id": data.task_id,
        "task_name": task["name"],
        "points_earned": points,
        "date": today,
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "streak_bonus": streak_bonus,
    }
    await db.completions.insert_one(completion)

    new_total = user.get("total_points", 0) + points
    await db.users.update_one({"id": user_id}, {"$set": {"total_points": new_total, "current_streak": streak + 1}})

    return {k: v for k, v in completion.items() if k != "_id"}

async def calculate_streak(user_id: str) -> int:
    streak = 0
    today = datetime.now(timezone.utc).date()
    for i in range(1, 365):
        check_date = (today - timedelta(days=i)).strftime("%Y-%m-%d")
        completions = await db.completions.count_documents({"user_id": user_id, "date": check_date})
        if completions > 0:
            streak += 1
        else:
            break
    return streak

@api_router.get("/tasks/today/{user_id}")
async def get_today_tasks(user_id: str):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    tasks = await db.tasks.find({}, {"_id": 0}).to_list(100)
    completions = await db.completions.find({"user_id": user_id, "date": today}, {"_id": 0}).to_list(100)
    completed_ids = {c["task_id"] for c in completions}

    result = []
    for t in tasks:
        result.append({
            **t,
            "completed_today": t["id"] in completed_ids,
            "completion_info": next((c for c in completions if c["task_id"] == t["id"]), None)
        })
    return result

# ─── Points ────────────────────────────────────────────────────────────────

@api_router.get("/points/{user_id}")
async def get_points(user_id: str):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(404, "User not found")
    streak = await calculate_streak(user_id)
    return {
        "total_points": user.get("total_points", 0),
        "current_streak": streak,
        "streak_bonus_active": streak >= 4,
    }

@api_router.get("/points/history/{user_id}")
async def get_points_history(user_id: str):
    completions = await db.completions.find({"user_id": user_id}, {"_id": 0}).sort("completed_at", -1).to_list(100)
    return completions

# ─── Rewards ───────────────────────────────────────────────────────────────

@api_router.get("/rewards")
async def get_rewards():
    rewards = await db.rewards.find({}, {"_id": 0}).to_list(100)
    return rewards

@api_router.post("/rewards")
async def create_reward(data: RewardCreate):
    reward_id = str(uuid.uuid4())
    reward = {
        "id": reward_id,
        "name": data.name,
        "description": data.description,
        "points_cost": data.points_cost,
        "emoji": data.emoji,
    }
    await db.rewards.insert_one(reward)
    return {k: v for k, v in reward.items() if k != "_id"}

@api_router.delete("/rewards/{reward_id}")
async def delete_reward(reward_id: str):
    result = await db.rewards.delete_one({"id": reward_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Reward not found")
    return {"message": "Reward deleted"}

@api_router.post("/rewards/spin/{user_id}")
async def spin_wheel(user_id: str):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(404, "User not found")

    rewards = await db.rewards.find({}, {"_id": 0}).to_list(100)
    if not rewards:
        raise HTTPException(400, "No rewards available")

    affordable = [r for r in rewards if r["points_cost"] <= user.get("total_points", 0)]
    if not affordable:
        raise HTTPException(400, f"Not enough Piggie Points! You have {user.get('total_points', 0)} points.")

    won = random.choice(affordable)
    new_total = user.get("total_points", 0) - won["points_cost"]
    await db.users.update_one({"id": user_id}, {"$set": {"total_points": new_total}})

    # Log the redemption
    await db.redemptions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "reward_id": won["id"],
        "reward_name": won["name"],
        "points_spent": won["points_cost"],
        "redeemed_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"won_reward": won, "points_remaining": new_total, "all_rewards": rewards}

# ─── Goals ─────────────────────────────────────────────────────────────────

@api_router.get("/goals/{user_id}")
async def get_goals(user_id: str):
    goals = await db.goals.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    total = user.get("total_points", 0) if user else 0
    for g in goals:
        g["current_points"] = min(total, g["target_points"])
        g["completed"] = total >= g["target_points"]
    return goals

@api_router.post("/goals/{user_id}")
async def create_goal(user_id: str, data: GoalCreate):
    goal_id = str(uuid.uuid4())
    goal = {
        "id": goal_id,
        "user_id": user_id,
        "title": data.title,
        "description": data.description,
        "target_points": data.target_points,
        "goal_type": data.goal_type,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.goals.insert_one(goal)
    return {k: v for k, v in goal.items() if k != "_id"}

@api_router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str):
    result = await db.goals.delete_one({"id": goal_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Goal not found")
    return {"message": "Goal deleted"}

# ─── Photos ────────────────────────────────────────────────────────────────

@api_router.get("/photos")
async def get_photos():
    photos = await db.photos.find({}, {"_id": 0}).to_list(50)
    return photos

@api_router.post("/photos")
async def upload_photo(data: PhotoUpload):
    photo_id = str(uuid.uuid4())
    photo = {
        "id": photo_id,
        "name": data.name,
        "image_data": data.image_data,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.photos.insert_one(photo)
    return {"id": photo_id, "name": data.name, "created_at": photo["created_at"]}

@api_router.delete("/photos/{photo_id}")
async def delete_photo(photo_id: str):
    result = await db.photos.delete_one({"id": photo_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Photo not found")
    return {"message": "Photo deleted"}

# ─── Monitor (Boyfriend Mode) ─────────────────────────────────────────────

@api_router.post("/monitor/login")
async def monitor_login(data: MonitorLogin):
    settings = await db.settings.find_one({"type": "app_settings"}, {"_id": 0})
    if not settings or data.monitor_pin != settings.get("monitor_pin", "1234"):
        raise HTTPException(401, "Invalid monitor PIN")
    return {"success": True, "message": "Monitor access granted"}

@api_router.get("/monitor/dashboard")
async def monitor_dashboard():
    users = await db.users.find({}, {"_id": 0}).to_list(10)
    all_completions = await db.completions.find({}, {"_id": 0}).sort("completed_at", -1).to_list(200)
    recent_redemptions = await db.redemptions.find({}, {"_id": 0}).sort("redeemed_at", -1).to_list(50)

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_completions = [c for c in all_completions if c.get("date") == today]

    return {
        "users": users,
        "today_completions": today_completions,
        "recent_completions": all_completions[:20],
        "recent_redemptions": recent_redemptions[:10],
        "total_tasks_completed": len(all_completions),
    }

# ─── Settings ──────────────────────────────────────────────────────────────

@api_router.get("/settings")
async def get_settings():
    settings = await db.settings.find_one({"type": "app_settings"}, {"_id": 0})
    if not settings:
        return {"monitor_pin": "1234", "wake_target_hour": 6, "wake_target_minute": 0}
    return {
        "monitor_pin": settings.get("monitor_pin", "1234"),
        "wake_target_hour": settings.get("wake_target_hour", 6),
        "wake_target_minute": settings.get("wake_target_minute", 0),
    }

@api_router.put("/settings")
async def update_settings(data: SettingsUpdate):
    update_dict = {}
    if data.monitor_pin is not None:
        update_dict["monitor_pin"] = data.monitor_pin
    if data.wake_target_hour is not None:
        update_dict["wake_target_hour"] = data.wake_target_hour
    if data.wake_target_minute is not None:
        update_dict["wake_target_minute"] = data.wake_target_minute
    if update_dict:
        await db.settings.update_one({"type": "app_settings"}, {"$set": update_dict}, upsert=True)
    return {"message": "Settings updated"}

@api_router.get("/")
async def root():
    return {"message": "Piggie Points API"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
