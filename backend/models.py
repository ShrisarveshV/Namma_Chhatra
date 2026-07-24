from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Date, Time, Boolean
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String) # Teacher, Headmaster, Admin
    dob = Column(Date, nullable=True)
    phone = Column(String, nullable=True)
    profile_photo = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    teacher_profile = relationship("Teacher", back_populates="user", uselist=False)
    headmaster_profile = relationship("Headmaster", back_populates="user", uselist=False)

class ClassModel(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True)
    class_name = Column(String, index=True)

    # Relationships
    sections = relationship("Section", back_populates="class_")
    students = relationship("Student", back_populates="class_")

class Section(Base):
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"))
    section_name = Column(String)

    # Relationships
    class_ = relationship("ClassModel", back_populates="sections")
    students = relationship("Student", back_populates="section")
    assignments = relationship("TeacherSectionAssignment", back_populates="section")

class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    employee_id = Column(String, unique=True, index=True)
    phone = Column(String)

    # Relationships
    user = relationship("User", back_populates="teacher_profile")
    assignments = relationship("TeacherSectionAssignment", back_populates="teacher")

class Headmaster(Base):
    __tablename__ = "headmaster"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))

    # Relationships
    user = relationship("User", back_populates="headmaster_profile")

class TeacherSectionAssignment(Base):
    __tablename__ = "teacher_section_assignments"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"))
    section_id = Column(Integer, ForeignKey("sections.id"))

    # Relationships
    teacher = relationship("Teacher", back_populates="assignments")
    section = relationship("Section", back_populates="assignments")

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    roll_number = Column(String, unique=True, index=True)
    student_name = Column(String, index=True)
    gender = Column(String)
    dob = Column(Date)
    class_id = Column(Integer, ForeignKey("classes.id"))
    section_id = Column(Integer, ForeignKey("sections.id"))
    parent_name = Column(String)
    parent_phone = Column(String)
    address = Column(String)
    aadhaar = Column(String, nullable=True)
    admission_number = Column(String, nullable=True)
    joining_date = Column(Date, nullable=True)
    teacher_remarks = Column(String, nullable=True)
    
    # AI Prediction Engine Fields
    dropout_risk_score = Column(Float, nullable=True)
    dropout_risk_level = Column(String, nullable=True)
    risk_reasons = Column(String, nullable=True)
    last_evaluated_at = Column(DateTime, nullable=True)
    
    # Student Demographic/Performance Fields (used by AI)
    commute_distance_km = Column(Float, nullable=True)
    income_bracket = Column(String, nullable=True)
    grade_drop_pct = Column(Float, nullable=True)
    counseling_flag = Column(Boolean, default=False)

    # Relationships
    class_ = relationship("ClassModel", back_populates="students")
    section = relationship("Section", back_populates="students")
    attendance_records = relationship("Attendance", back_populates="student")
    prediction = relationship("DropoutPrediction", back_populates="student", uselist=False)

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    attendance_date = Column(Date)
    check_in_time = Column(Time)
    status = Column(String) # Present, Absent, Late, Leave
    leave_type = Column(String, nullable=True) # Medical Leave, Other Leave Types

    # Relationships
    student = relationship("Student", back_populates="attendance_records")

class DropoutPrediction(Base):
    __tablename__ = "dropout_prediction"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    risk_score = Column(Float)
    risk_level = Column(String) # High, Medium, Low
    reason = Column(String)
    predicted_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("Student", back_populates="prediction")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    message = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"))
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class TeacherLeave(Base):
    __tablename__ = "teacher_leaves"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"))
    leave_date = Column(Date)
    leave_type = Column(String)
    reason = Column(String)

    # Relationships
    teacher = relationship("Teacher", backref="leaves")
