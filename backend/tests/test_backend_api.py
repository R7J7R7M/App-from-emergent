"""
Backend API Tests for Piggie Points App
Tests: Auth, Tasks, Rewards, Goals, Monitor Mode
"""
import pytest
import requests
import time

class TestHealthCheck:
    """Health check and basic connectivity"""
    
    def test_api_root(self, api_client, base_url):
        """Test API root endpoint"""
        response = api_client.get(f"{base_url}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ API root accessible: {data}")

class TestAuthentication:
    """Authentication endpoints - Register and Login"""
    
    def test_register_new_user(self, api_client, base_url):
        """Test user registration"""
        timestamp = int(time.time())
        payload = {
            "name": f"TEST_User_{timestamp}",
            "pin": "1234"
        }
        response = api_client.post(f"{base_url}/api/auth/register", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert data["name"] == payload["name"]
        assert data["total_points"] == 0
        assert data["current_streak"] == 0
        print(f"✓ User registered: {data['name']} with ID {data['id']}")
        
        # Verify persistence with GET
        user_id = data["id"]
        profile_response = api_client.get(f"{base_url}/api/auth/profile/{user_id}")
        assert profile_response.status_code == 200
        profile_data = profile_response.json()
        assert profile_data["id"] == user_id
        assert profile_data["name"] == payload["name"]
        print(f"✓ User persisted in database")
    
    def test_register_duplicate_user(self, api_client, base_url):
        """Test duplicate user registration fails"""
        timestamp = int(time.time())
        payload = {
            "name": f"TEST_Duplicate_{timestamp}",
            "pin": "1234"
        }
        # First registration
        response1 = api_client.post(f"{base_url}/api/auth/register", json=payload)
        assert response1.status_code == 200
        
        # Duplicate registration
        response2 = api_client.post(f"{base_url}/api/auth/register", json=payload)
        assert response2.status_code == 400
        data = response2.json()
        assert "already exists" in data["detail"].lower()
        print(f"✓ Duplicate registration blocked correctly")
    
    def test_login_success(self, api_client, base_url):
        """Test successful login"""
        # Register first
        timestamp = int(time.time())
        payload = {
            "name": f"TEST_LoginUser_{timestamp}",
            "pin": "5678"
        }
        reg_response = api_client.post(f"{base_url}/api/auth/register", json=payload)
        assert reg_response.status_code == 200
        
        # Login
        login_response = api_client.post(f"{base_url}/api/auth/login", json=payload)
        assert login_response.status_code == 200
        
        data = login_response.json()
        assert "id" in data
        assert data["name"] == payload["name"]
        assert "total_points" in data
        assert "current_streak" in data
        print(f"✓ Login successful for {data['name']}")
    
    def test_login_invalid_credentials(self, api_client, base_url):
        """Test login with invalid credentials"""
        payload = {
            "name": "NonExistentUser",
            "pin": "9999"
        }
        response = api_client.post(f"{base_url}/api/auth/login", json=payload)
        assert response.status_code == 401
        data = response.json()
        assert "invalid" in data["detail"].lower()
        print(f"✓ Invalid login blocked correctly")

class TestTasks:
    """Task endpoints - GET tasks, complete tasks"""
    
    def test_get_all_tasks(self, api_client, base_url):
        """Test getting all tasks"""
        response = api_client.get(f"{base_url}/api/tasks")
        assert response.status_code == 200
        
        tasks = response.json()
        assert isinstance(tasks, list)
        assert len(tasks) >= 4  # Should have 4 default tasks
        
        # Verify default tasks exist
        task_names = [t["name"] for t in tasks]
        assert "20 Min Walk" in task_names
        assert "1 Hour Gym" in task_names
        assert "Wake Before 6" in task_names
        assert "Zero Sugar Day" in task_names
        print(f"✓ Retrieved {len(tasks)} tasks including defaults")
    
    def test_get_today_tasks_for_user(self, api_client, base_url):
        """Test getting today's tasks for a user"""
        # Register user
        timestamp = int(time.time())
        user_payload = {
            "name": f"TEST_TaskUser_{timestamp}",
            "pin": "1234"
        }
        user_response = api_client.post(f"{base_url}/api/auth/register", json=user_payload)
        user_id = user_response.json()["id"]
        
        # Get today's tasks
        response = api_client.get(f"{base_url}/api/tasks/today/{user_id}")
        assert response.status_code == 200
        
        tasks = response.json()
        assert isinstance(tasks, list)
        for task in tasks:
            assert "completed_today" in task
            assert task["completed_today"] == False  # New user, no completions
        print(f"✓ Retrieved today's tasks for user {user_id}")
    
    def test_complete_manual_task(self, api_client, base_url):
        """Test completing a manual task"""
        # Register user
        timestamp = int(time.time())
        user_payload = {
            "name": f"TEST_CompleteUser_{timestamp}",
            "pin": "1234"
        }
        user_response = api_client.post(f"{base_url}/api/auth/register", json=user_payload)
        user_id = user_response.json()["id"]
        
        # Get tasks to find Zero Sugar Day (manual task)
        tasks_response = api_client.get(f"{base_url}/api/tasks")
        tasks = tasks_response.json()
        manual_task = next((t for t in tasks if t["task_type"] == "manual"), None)
        assert manual_task is not None
        
        # Complete the task
        complete_payload = {
            "task_id": manual_task["id"],
            "duration_seconds": 0
        }
        response = api_client.post(f"{base_url}/api/tasks/complete/{user_id}", json=complete_payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["task_id"] == manual_task["id"]
        assert data["points_earned"] == manual_task["points"]
        print(f"✓ Task completed: {data['task_name']} for {data['points_earned']} points")
        
        # Verify points updated
        points_response = api_client.get(f"{base_url}/api/points/{user_id}")
        assert points_response.status_code == 200
        points_data = points_response.json()
        assert points_data["total_points"] == manual_task["points"]
        print(f"✓ User points updated to {points_data['total_points']}")
    
    def test_complete_task_twice_same_day(self, api_client, base_url):
        """Test completing same task twice on same day fails"""
        # Register user
        timestamp = int(time.time())
        user_payload = {
            "name": f"TEST_DuplicateTask_{timestamp}",
            "pin": "1234"
        }
        user_response = api_client.post(f"{base_url}/api/auth/register", json=user_payload)
        user_id = user_response.json()["id"]
        
        # Get a manual task (not timer task)
        tasks_response = api_client.get(f"{base_url}/api/tasks")
        tasks = tasks_response.json()
        task = next((t for t in tasks if t["task_type"] == "manual"), tasks[0])
        
        # Complete once
        complete_payload = {"task_id": task["id"], "duration_seconds": 0}
        response1 = api_client.post(f"{base_url}/api/tasks/complete/{user_id}", json=complete_payload)
        assert response1.status_code == 200
        
        # Try to complete again
        response2 = api_client.post(f"{base_url}/api/tasks/complete/{user_id}", json=complete_payload)
        assert response2.status_code == 400
        data = response2.json()
        assert "already completed" in data["detail"].lower()
        print(f"✓ Duplicate task completion blocked")
    
    def test_create_custom_task(self, api_client, base_url):
        """Test creating a custom task"""
        timestamp = int(time.time())
        payload = {
            "name": f"TEST_CustomTask_{timestamp}",
            "description": "Test custom task",
            "points": 5,
            "task_type": "manual",
            "duration_minutes": 0,
            "icon": "star"
        }
        response = api_client.post(f"{base_url}/api/tasks", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == payload["name"]
        assert data["points"] == payload["points"]
        assert data["is_default"] == False
        print(f"✓ Custom task created: {data['name']}")

class TestRewards:
    """Reward endpoints - GET rewards, spin wheel"""
    
    def test_get_all_rewards(self, api_client, base_url):
        """Test getting all rewards"""
        response = api_client.get(f"{base_url}/api/rewards")
        assert response.status_code == 200
        
        rewards = response.json()
        assert isinstance(rewards, list)
        assert len(rewards) >= 8  # Should have 8 default rewards
        
        # Verify structure
        for reward in rewards:
            assert "id" in reward
            assert "name" in reward
            assert "points_cost" in reward
            assert "emoji" in reward
        print(f"✓ Retrieved {len(rewards)} rewards")
    
    def test_spin_wheel_insufficient_points(self, api_client, base_url):
        """Test spinning wheel with insufficient points"""
        # Register user with 0 points
        timestamp = int(time.time())
        user_payload = {
            "name": f"TEST_SpinUser_{timestamp}",
            "pin": "1234"
        }
        user_response = api_client.post(f"{base_url}/api/auth/register", json=user_payload)
        user_id = user_response.json()["id"]
        
        # Try to spin
        response = api_client.post(f"{base_url}/api/rewards/spin/{user_id}")
        assert response.status_code == 400
        data = response.json()
        assert "not enough" in data["detail"].lower()
        print(f"✓ Spin blocked for insufficient points")
    
    def test_spin_wheel_success(self, api_client, base_url):
        """Test successful spin wheel"""
        # Register user
        timestamp = int(time.time())
        user_payload = {
            "name": f"TEST_SpinSuccess_{timestamp}",
            "pin": "1234"
        }
        user_response = api_client.post(f"{base_url}/api/auth/register", json=user_payload)
        user_id = user_response.json()["id"]
        
        # Complete tasks to earn points
        tasks_response = api_client.get(f"{base_url}/api/tasks")
        tasks = tasks_response.json()
        
        # Complete multiple tasks to get enough points
        for task in tasks[:3]:
            complete_payload = {"task_id": task["id"], "duration_seconds": 0}
            api_client.post(f"{base_url}/api/tasks/complete/{user_id}", json=complete_payload)
        
        # Check points
        points_response = api_client.get(f"{base_url}/api/points/{user_id}")
        points_before = points_response.json()["total_points"]
        print(f"  User has {points_before} points before spin")
        
        if points_before >= 10:  # Minimum reward cost
            # Spin wheel
            response = api_client.post(f"{base_url}/api/rewards/spin/{user_id}")
            assert response.status_code == 200
            
            data = response.json()
            assert "won_reward" in data
            assert "points_remaining" in data
            assert data["points_remaining"] < points_before
            print(f"✓ Spin successful: Won {data['won_reward']['name']}")
        else:
            print(f"⚠ Skipping spin test - insufficient points ({points_before})")
    
    def test_create_custom_reward(self, api_client, base_url):
        """Test creating a custom reward"""
        timestamp = int(time.time())
        payload = {
            "name": f"TEST_CustomReward_{timestamp}",
            "description": "Test reward",
            "points_cost": 20,
            "emoji": "🎁"
        }
        response = api_client.post(f"{base_url}/api/rewards", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == payload["name"]
        assert data["points_cost"] == payload["points_cost"]
        print(f"✓ Custom reward created: {data['name']}")

class TestGoals:
    """Goal endpoints - GET, POST, DELETE goals"""
    
    def test_get_user_goals_empty(self, api_client, base_url):
        """Test getting goals for new user"""
        # Register user
        timestamp = int(time.time())
        user_payload = {
            "name": f"TEST_GoalUser_{timestamp}",
            "pin": "1234"
        }
        user_response = api_client.post(f"{base_url}/api/auth/register", json=user_payload)
        user_id = user_response.json()["id"]
        
        # Get goals
        response = api_client.get(f"{base_url}/api/goals/{user_id}")
        assert response.status_code == 200
        
        goals = response.json()
        assert isinstance(goals, list)
        assert len(goals) == 0  # New user has no goals
        print(f"✓ New user has no goals")
    
    def test_create_goal(self, api_client, base_url):
        """Test creating a goal"""
        # Register user
        timestamp = int(time.time())
        user_payload = {
            "name": f"TEST_CreateGoal_{timestamp}",
            "pin": "1234"
        }
        user_response = api_client.post(f"{base_url}/api/auth/register", json=user_payload)
        user_id = user_response.json()["id"]
        
        # Create goal
        goal_payload = {
            "title": f"TEST_Goal_{timestamp}",
            "description": "Test goal description",
            "target_points": 50,
            "goal_type": "short"
        }
        response = api_client.post(f"{base_url}/api/goals/{user_id}", json=goal_payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["title"] == goal_payload["title"]
        assert data["target_points"] == goal_payload["target_points"]
        assert data["goal_type"] == goal_payload["goal_type"]
        print(f"✓ Goal created: {data['title']}")
        
        # Verify persistence
        goals_response = api_client.get(f"{base_url}/api/goals/{user_id}")
        goals = goals_response.json()
        assert len(goals) == 1
        assert goals[0]["title"] == goal_payload["title"]
        print(f"✓ Goal persisted in database")

class TestMonitorMode:
    """Monitor mode endpoints - Login and Dashboard"""
    
    def test_monitor_login_success(self, api_client, base_url):
        """Test monitor login with correct PIN"""
        payload = {"monitor_pin": "1234"}
        response = api_client.post(f"{base_url}/api/monitor/login", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        print(f"✓ Monitor login successful")
    
    def test_monitor_login_invalid_pin(self, api_client, base_url):
        """Test monitor login with invalid PIN"""
        payload = {"monitor_pin": "9999"}
        response = api_client.post(f"{base_url}/api/monitor/login", json=payload)
        assert response.status_code == 401
        
        data = response.json()
        assert "invalid" in data["detail"].lower()
        print(f"✓ Invalid monitor PIN blocked")
    
    def test_monitor_dashboard(self, api_client, base_url):
        """Test monitor dashboard endpoint"""
        response = api_client.get(f"{base_url}/api/monitor/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "users" in data
        assert "today_completions" in data
        assert "recent_completions" in data
        assert "recent_redemptions" in data
        assert "total_tasks_completed" in data
        assert isinstance(data["users"], list)
        print(f"✓ Monitor dashboard accessible with {len(data['users'])} users")

class TestPoints:
    """Points endpoints"""
    
    def test_get_user_points(self, api_client, base_url):
        """Test getting user points"""
        # Register user
        timestamp = int(time.time())
        user_payload = {
            "name": f"TEST_PointsUser_{timestamp}",
            "pin": "1234"
        }
        user_response = api_client.post(f"{base_url}/api/auth/register", json=user_payload)
        user_id = user_response.json()["id"]
        
        # Get points
        response = api_client.get(f"{base_url}/api/points/{user_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_points" in data
        assert "current_streak" in data
        assert "streak_bonus_active" in data
        assert data["total_points"] == 0  # New user
        assert data["current_streak"] == 0
        print(f"✓ Points retrieved for user")
