from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date, time


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserBase(BaseModel):
    email: str
    full_name: str
    role: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class User(UserBase):
    id: int
    dob: Optional[date] = None
    phone: Optional[str] = None
    profile_photo: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    dob: Optional[date] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    profile_photo: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    email: str
    full_name: str
    role: str


# ── Classes / Sections ────────────────────────────────────────────────────────

class ClassSchema(BaseModel):
    id: int
    class_name: str
    class Config:
        from_attributes = True

class ClassCreate(BaseModel):
    class_name: str

class SectionSchema(BaseModel):
    id: int
    class_id: int
    section_name: str
    class Config:
        from_attributes = True

class SectionCreate(BaseModel):
    class_id: int
    section_name: str


# ── Teacher ───────────────────────────────────────────────────────────────────

class TeacherSchema(BaseModel):
    id: int
    user_id: int
    employee_id: Optional[str] = None
    phone: Optional[str] = None
    user: User
    class Config:
        from_attributes = True

class TeacherCreate(BaseModel):
    full_name: str
    email: str
    password: str
    phone: Optional[str] = None
    employee_id: str
    section_ids: List[int] = []

class TeacherUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    phone: Optional[str] = None
    employee_id: Optional[str] = None
    section_ids: Optional[List[int]] = None


# ── Assignment ────────────────────────────────────────────────────────────────

class AssignmentCreate(BaseModel):
    teacher_id: int
    section_id: int


# ── Student ───────────────────────────────────────────────────────────────────

class StudentSchema(BaseModel):
    id: int
    roll_number: str
    student_name: str
    gender: str
    dob: Optional[date] = None
    class_id: int
    section_id: int
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    address: Optional[str] = None
    aadhaar: Optional[str] = None
    admission_number: Optional[str] = None
    joining_date: Optional[date] = None
    teacher_remarks: Optional[str] = None
    dropout_risk_score: Optional[float] = None
    dropout_risk_level: Optional[str] = None
    risk_reasons: Optional[str] = None
    last_evaluated_at: Optional[datetime] = None
    commute_distance_km: Optional[float] = None
    income_bracket: Optional[str] = None
    grade_drop_pct: Optional[float] = None
    risk_level: Optional[str] = None
    class Config:
        from_attributes = True

class StudentCreate(BaseModel):
    roll_number: str
    student_name: str
    gender: str
    dob: Optional[date] = None
    class_id: int
    section_id: int
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    address: Optional[str] = None
    aadhaar: Optional[str] = None
    admission_number: Optional[str] = None
    joining_date: Optional[date] = None
    commute_distance_km: Optional[float] = None
    income_bracket: Optional[str] = None
    grade_drop_pct: Optional[float] = None

class StudentUpdate(BaseModel):
    roll_number: Optional[str] = None
    student_name: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[date] = None
    class_id: Optional[int] = None
    section_id: Optional[int] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    address: Optional[str] = None
    aadhaar: Optional[str] = None
    admission_number: Optional[str] = None
    joining_date: Optional[date] = None
    teacher_remarks: Optional[str] = None
    commute_distance_km: Optional[float] = None
    income_bracket: Optional[str] = None
    grade_drop_pct: Optional[float] = None


# ── Attendance / Prediction ───────────────────────────────────────────────────

class AttendanceSchema(BaseModel):
    id: int
    student_id: int
    attendance_date: date
    check_in_time: Optional[time] = None
    status: str
    leave_type: Optional[str] = None
    class Config:
        from_attributes = True

class DropoutPredictionSchema(BaseModel):
    id: int
    student_id: int
    risk_score: float
    risk_level: str
    reason: str
    predicted_at: datetime
    class Config:
        from_attributes = True


# ── Notification ──────────────────────────────────────────────────────────────

class NotificationSchema(BaseModel):
    id: int
    title: str
    message: str
    user_id: int
    is_read: bool
    created_at: datetime
    class Config:
        from_attributes = True
class TeacherLeaveSchema(BaseModel):
    id: int
    teacher_id: int
    leave_date: date
    leave_type: str
    reason: str
    class Config:
        from_attributes = True

class TeacherLeaveResponse(TeacherLeaveSchema):
    teacher_name: str
