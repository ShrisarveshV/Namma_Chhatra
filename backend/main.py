"""
main.py — Namma Chhatra FastAPI Backend
Complete REST API for Students, Teachers, Classes, Sections, Dashboards,
Analytics, Notifications, and Export.
"""

from fastapi import FastAPI, Depends, HTTPException, status, Query, Form, File, UploadFile
from fastapi.staticfiles import StaticFiles
import os
import uuid
import shutil
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List, Optional
from datetime import timedelta, date, datetime
import csv
import io

from apscheduler.schedulers.background import BackgroundScheduler
from services.prediction_service import evaluate_student

import models, schemas, database, auth

app = FastAPI(title="Namma Chhatra API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.on_event("startup")
def on_startup():
    # Run schema migrations first
    database.migrate_db()
    # Then seed if empty
    try:
        from init_db import seed_if_empty
        seed_if_empty()
    except Exception as e:
        print(f"[startup] seed error: {e}")

    # Start Cron Job
    scheduler = BackgroundScheduler()
    scheduler.add_job(nightly_batch_job, 'cron', hour=23, minute=59)
    scheduler.start()
    print("[startup] APScheduler started for nightly batch jobs")

def nightly_batch_job():
    print("[Cron] Starting nightly AI prediction batch job...")
    db = database.SessionLocal()
    try:
        students = db.query(models.Student).all()
        for s in students:
            all_att = db.query(models.Attendance).filter(models.Attendance.student_id == s.id).all()
            present = sum(1 for a in all_att if a.status in ("Present", "Late"))
            att_pct = round(present / len(all_att) * 100, 1) if all_att else 100.0
            
            res = evaluate_student(s, att_pct)
            s.dropout_risk_score = res["dropout_risk_score"]
            s.dropout_risk_level = res["dropout_risk_level"]
            s.risk_reasons = res["risk_reasons"]
            s.last_evaluated_at = res["last_evaluated_at"]
        db.commit()
        print(f"[Cron] Updated risk scores for {len(students)} students.")
    except Exception as e:
        print(f"[Cron] Error: {e}")
    finally:
        db.close()



# ── Helpers ───────────────────────────────────────────────────────────────────

def get_school_days(n: int) -> list:
    """Return last n school days (Mon-Sat), oldest first, including today."""
    days = []
    d = date.today()
    while len(days) < n:
        if d.weekday() != 6:   # not Sunday
            days.append(d)
        d -= timedelta(days=1)
    days.reverse()
    return days


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _create_high_risk_notification(db: Session, student: models.Student, pred: models.DropoutPrediction):
    """Auto-create notifications when a student is flagged High Risk."""
    # Notify the teacher of the section
    assignment = db.query(models.TeacherSectionAssignment).filter(
        models.TeacherSectionAssignment.section_id == student.section_id
    ).first()
    if assignment:
        teacher = db.query(models.Teacher).filter(models.Teacher.id == assignment.teacher_id).first()
        if teacher:
            db.add(models.Notification(
                title="High Risk Student Alert",
                message=f"{student.student_name} has been flagged as High Risk "
                        f"(Score: {round(pred.risk_score, 1)}%). Reason: {pred.reason}",
                user_id=teacher.user_id,
                is_read=False,
            ))
    # Notify headmaster
    hm_user = db.query(models.User).filter(models.User.role == "HEADMASTER").first()
    if hm_user:
        db.add(models.Notification(
            title="High Risk Alert — Action Required",
            message=f"Student {student.student_name} has dropout risk score of "
                    f"{round(pred.risk_score, 1)}%. Reason: {pred.reason}",
            user_id=hm_user.id,
            is_read=False,
        ))
    db.commit()


# ── AUTH ──────────────────────────────────────────────────────────────────────

@app.post("/signup", response_model=schemas.Token)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    new_user = models.User(
        email=user.email, full_name=user.full_name, role=user.role,
        password_hash=auth.get_password_hash(user.password)
    )
    db.add(new_user); db.commit(); db.refresh(new_user)
    if user.role == "TEACHER":
        db.add(models.Teacher(user_id=new_user.id, employee_id=f"EMP-{new_user.id}"))
        db.commit()
    elif user.role == "HEADMASTER":
        db.add(models.Headmaster(user_id=new_user.id))
        db.commit()
    token = auth.create_access_token(
        data={"sub": new_user.email, "role": new_user.role},
        expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": token, "token_type": "bearer", "user_id": new_user.id,
            "email": new_user.email, "full_name": new_user.full_name, "role": new_user.role}


@app.post("/login", response_model=schemas.Token)
def login(creds: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == creds.email).first()
    if not user or not auth.verify_password(creds.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Incorrect username or password",
                            headers={"WWW-Authenticate": "Bearer"})
    token = auth.create_access_token(
        data={"sub": user.email, "role": user.role},
        expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": token, "token_type": "bearer", "user_id": user.id,
            "email": user.email, "full_name": user.full_name, "role": user.role}


@app.post("/logout")
def logout():
    return {"message": "Logged out. Discard token on client."}


@app.get("/auth/me")
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return {"user_id": current_user.id, "email": current_user.email,
            "full_name": current_user.full_name, "role": current_user.role}


@app.get("/profile")
def get_profile(current_user: models.User = Depends(auth.get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "dob": str(current_user.dob) if current_user.dob else None,
        "phone": current_user.phone,
        "profile_photo": current_user.profile_photo,
    }

@app.put("/profile")
def update_profile(
    full_name: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    dob: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    password: Optional[str] = Form(None),
    profile_photo: Optional[UploadFile] = File(None),
    db: Session = Depends(database.get_db),
    current_user_req: models.User = Depends(auth.get_current_user)
):
    current_user = db.query(models.User).filter(models.User.id == current_user_req.id).first()
    if full_name:
        current_user.full_name = full_name
    if email:
        current_user.email = email
    if dob:
        try:
            current_user.dob = datetime.strptime(dob, "%Y-%m-%d").date()
        except ValueError:
            pass
    if phone:
        current_user.phone = phone
    if password:
        current_user.password_hash = auth.get_password_hash(password)
        
    if profile_photo and profile_photo.filename:
        ext = profile_photo.filename.split(".")[-1]
        filename = f"{uuid.uuid4()}.{ext}"
        filepath = os.path.join("uploads", filename)
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(profile_photo.file, buffer)
        current_user.profile_photo = f"/uploads/{filename}"
        
    db.commit()
    db.refresh(current_user)
    return {"status": "success", "message": "Profile updated", "profile_photo": current_user.profile_photo}


# ── CLASSES ───────────────────────────────────────────────────────────────────

@app.get("/classes", response_model=List[schemas.ClassSchema])
def get_classes(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    q = db.query(models.ClassModel)
    if current_user.role == "TEACHER":
        teacher = db.query(models.Teacher).filter(models.Teacher.user_id == current_user.id).first()
        if teacher:
            asgns = db.query(models.TeacherSectionAssignment).filter(
                models.TeacherSectionAssignment.teacher_id == teacher.id).all()
            sec_ids = [a.section_id for a in asgns]
            class_ids = [s.class_id for s in db.query(models.Section).filter(models.Section.id.in_(sec_ids)).all()]
            q = q.filter(models.ClassModel.id.in_(class_ids))
        else:
            return []
    return q.order_by(models.ClassModel.id).all()


@app.post("/classes", response_model=schemas.ClassSchema)
def create_class(cls: schemas.ClassCreate, db: Session = Depends(get_db),
                 current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role != "HEADMASTER":
        raise HTTPException(status_code=403, detail="Only headmaster can manage classes")
    existing = db.query(models.ClassModel).filter(models.ClassModel.class_name == cls.class_name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Class already exists")
    new_cls = models.ClassModel(class_name=cls.class_name)
    db.add(new_cls); db.commit(); db.refresh(new_cls)
    return new_cls


@app.delete("/classes/{class_id}")
def delete_class(class_id: int, db: Session = Depends(get_db),
                 current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role != "HEADMASTER":
        raise HTTPException(status_code=403, detail="Only headmaster can manage classes")
    student_count = db.query(models.Student).filter(models.Student.class_id == class_id).count()
    if student_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete: {student_count} students enrolled in this class")
    cls = db.query(models.ClassModel).filter(models.ClassModel.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    db.delete(cls); db.commit()
    return {"status": "deleted"}


# ── SECTIONS ──────────────────────────────────────────────────────────────────

@app.get("/sections", response_model=List[schemas.SectionSchema])
def get_sections(class_id: Optional[int] = None, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    q = db.query(models.Section)
    if class_id:
        q = q.filter(models.Section.class_id == class_id)
        
    if current_user.role == "TEACHER":
        teacher = db.query(models.Teacher).filter(models.Teacher.user_id == current_user.id).first()
        if teacher:
            asgns = db.query(models.TeacherSectionAssignment).filter(
                models.TeacherSectionAssignment.teacher_id == teacher.id).all()
            sec_ids = [a.section_id for a in asgns]
            q = q.filter(models.Section.id.in_(sec_ids))
        else:
            return []
            
    return q.order_by(models.Section.class_id, models.Section.section_name).all()


@app.post("/sections", response_model=schemas.SectionSchema)
def create_section(sec: schemas.SectionCreate, db: Session = Depends(get_db),
                   current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role != "HEADMASTER":
        raise HTTPException(status_code=403, detail="Only headmaster can manage sections")
    existing = db.query(models.Section).filter(
        models.Section.class_id == sec.class_id,
        models.Section.section_name == sec.section_name
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Section already exists in this class")
    new_sec = models.Section(class_id=sec.class_id, section_name=sec.section_name)
    db.add(new_sec); db.commit(); db.refresh(new_sec)
    return new_sec


@app.delete("/sections/{section_id}")
def delete_section(section_id: int, db: Session = Depends(get_db),
                   current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role != "HEADMASTER":
        raise HTTPException(status_code=403, detail="Only headmaster can manage sections")
    student_count = db.query(models.Student).filter(models.Student.section_id == section_id).count()
    if student_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete: {student_count} students in this section")
    sec = db.query(models.Section).filter(models.Section.id == section_id).first()
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found")
    db.query(models.TeacherSectionAssignment).filter(
        models.TeacherSectionAssignment.section_id == section_id).delete()
    db.delete(sec); db.commit()
    return {"status": "deleted"}


# ── ASSIGNMENTS ───────────────────────────────────────────────────────────────

@app.get("/assignments")
def get_assignments(db: Session = Depends(get_db),
                    current_user: models.User = Depends(auth.get_current_user)):
    assignments = db.query(models.TeacherSectionAssignment).all()
    result = []
    for a in assignments:
        teacher = db.query(models.Teacher).filter(models.Teacher.id == a.teacher_id).first()
        t_user = db.query(models.User).filter(models.User.id == teacher.user_id).first() if teacher else None
        sec = db.query(models.Section).filter(models.Section.id == a.section_id).first()
        cls = db.query(models.ClassModel).filter(models.ClassModel.id == sec.class_id).first() if sec else None
        result.append({
            "id": a.id,
            "teacher_id": a.teacher_id,
            "teacher_name": t_user.full_name if t_user else "Unknown",
            "section_id": a.section_id,
            "section_name": sec.section_name if sec else "",
            "class_name": cls.class_name if cls else "",
            "class_id": cls.id if cls else None,
        })
    return result


@app.post("/assignments")
def create_assignment(data: schemas.AssignmentCreate, db: Session = Depends(get_db),
                      current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role != "HEADMASTER":
        raise HTTPException(status_code=403, detail="Only headmaster can manage assignments")
    existing = db.query(models.TeacherSectionAssignment).filter(
        models.TeacherSectionAssignment.teacher_id == data.teacher_id,
        models.TeacherSectionAssignment.section_id == data.section_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Assignment already exists")
    new_a = models.TeacherSectionAssignment(teacher_id=data.teacher_id, section_id=data.section_id)
    db.add(new_a); db.commit(); db.refresh(new_a)
    return {"id": new_a.id, "teacher_id": new_a.teacher_id, "section_id": new_a.section_id}


@app.delete("/assignments/{assignment_id}")
def delete_assignment(assignment_id: int, db: Session = Depends(get_db),
                      current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role != "HEADMASTER":
        raise HTTPException(status_code=403, detail="Only headmaster can manage assignments")
    a = db.query(models.TeacherSectionAssignment).filter(
        models.TeacherSectionAssignment.id == assignment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(a); db.commit()
    return {"status": "deleted"}


# ── STUDENTS ──────────────────────────────────────────────────────────────────
# IMPORTANT: /students/lookup must be declared BEFORE /students/{student_id}

@app.get("/students/lookup")
def lookup_student(
    q: str = Query(..., description="Search by roll number, name, or admission number"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    students = db.query(models.Student).filter(
        models.Student.roll_number.ilike(f"%{q}%") |
        models.Student.student_name.ilike(f"%{q}%") |
        models.Student.admission_number.ilike(f"%{q}%")
    ).limit(20).all()

    results = []
    for s in students:
        cls = db.query(models.ClassModel).filter(models.ClassModel.id == s.class_id).first()
        sec = db.query(models.Section).filter(models.Section.id == s.section_id).first()
        assignment = db.query(models.TeacherSectionAssignment).filter(
            models.TeacherSectionAssignment.section_id == s.section_id).first()
        teacher_name = None
        if assignment:
            t = db.query(models.Teacher).filter(models.Teacher.id == assignment.teacher_id).first()
            if t:
                tu = db.query(models.User).filter(models.User.id == t.user_id).first()
                teacher_name = tu.full_name if tu else None

        all_att = db.query(models.Attendance).filter(models.Attendance.student_id == s.id).all()
        present = sum(1 for a in all_att if a.status in ("Present", "Late"))
        att_pct = round(present / len(all_att) * 100, 1) if all_att else 0
        last_att = sorted(all_att, key=lambda a: a.attendance_date, reverse=True)

        results.append({
            "id": s.id,
            "roll_number": s.roll_number,
            "student_name": s.student_name,
            "gender": s.gender,
            "dob": str(s.dob) if s.dob else None,
            "class_name": cls.class_name if cls else "",
            "section_name": sec.section_name if sec else "",
            "parent_name": s.parent_name,
            "parent_phone": s.parent_phone,
            "address": s.address,
            "admission_number": s.admission_number,
            "teacher_name": teacher_name,
            "attendance_percentage": att_pct,
            "total_days": len(all_att),
            "risk_score": round(s.dropout_risk_score, 1) if s.dropout_risk_score else 0,
            "risk_level": s.dropout_risk_level if s.dropout_risk_level else "Unknown",
            "risk_reason": s.risk_reasons if s.risk_reasons else None,
            "last_attendance_date": str(last_att[0].attendance_date) if last_att else None,
            "last_attendance_status": last_att[0].status if last_att else None,
        })
    return results


@app.get("/students", response_model=List[schemas.StudentSchema])
def get_students(
    class_id: Optional[int] = None,
    section_id: Optional[int] = None,
    search: Optional[str] = None,
    gender: Optional[str] = None,
    teacher_id: Optional[int] = None,
    risk_category: Optional[str] = None,
    year: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    q = db.query(models.Student)
    if current_user.role == "TEACHER":
        teacher = db.query(models.Teacher).filter(models.Teacher.user_id == current_user.id).first()
        if not teacher:
            return []
        assignments = db.query(models.TeacherSectionAssignment).filter(
            models.TeacherSectionAssignment.teacher_id == teacher.id).all()
        allowed_sections = [a.section_id for a in assignments]
        q = q.filter(models.Student.section_id.in_(allowed_sections))
    elif teacher_id: # Only apply teacher_id filter if not already scoped by being a teacher
        assignments = db.query(models.TeacherSectionAssignment).filter(
            models.TeacherSectionAssignment.teacher_id == teacher_id).all()
        allowed_sections = [a.section_id for a in assignments]
        q = q.filter(models.Student.section_id.in_(allowed_sections))

    if class_id:
        q = q.filter(models.Student.class_id == class_id)
    if section_id:
        q = q.filter(models.Student.section_id == section_id)
    if gender:
        q = q.filter(models.Student.gender == gender)
    if year:
        # Extract year from joining_date using string match or extract
        q = q.filter(extract('year', models.Student.joining_date) == int(year))

    if search:
        q = q.filter(
            models.Student.student_name.ilike(f"%{search}%") |
            models.Student.roll_number.ilike(f"%{search}%")
        )
    
    if risk_category:
        q = q.filter(models.Student.dropout_risk_level.ilike(f"%{risk_category}%"))
    
    students_db = q.order_by(models.Student.student_name).all()
    # Populate risk_level for response
    for s in students_db:
        s.risk_level = s.dropout_risk_level if s.dropout_risk_level else "Unknown"
    return students_db



@app.post("/students", response_model=schemas.StudentSchema)
def create_student(student: schemas.StudentCreate, db: Session = Depends(get_db),
                   current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role != "HEADMASTER":
        raise HTTPException(status_code=403, detail="Only headmaster can add students")
    if db.query(models.Student).filter(models.Student.roll_number == student.roll_number).first():
        raise HTTPException(status_code=400, detail="Roll number already exists")
    new_s = models.Student(**student.model_dump())
    db.add(new_s); db.commit(); db.refresh(new_s)

    # Initial Prediction — evaluate immediately
    res = evaluate_student(new_s, 100.0) # Assume 100% attendance for new student
    new_s.dropout_risk_score = res["dropout_risk_score"]
    new_s.dropout_risk_level = res["dropout_risk_level"]
    new_s.risk_reasons = res["risk_reasons"]
    new_s.last_evaluated_at = res["last_evaluated_at"]
    db.commit()

    # Notify teacher of the section
    assignment = db.query(models.TeacherSectionAssignment).filter(
        models.TeacherSectionAssignment.section_id == new_s.section_id).first()
    if assignment:
        teacher = db.query(models.Teacher).filter(models.Teacher.id == assignment.teacher_id).first()
        if teacher:
            sec = db.query(models.Section).filter(models.Section.id == new_s.section_id).first()
            db.add(models.Notification(
                title="New Student Added",
                message=f"{new_s.student_name} has been enrolled in your class "
                        f"(Section {sec.section_name if sec else ''}).",
                user_id=teacher.user_id, is_read=False))
            db.commit()
    return new_s


@app.get("/students/{student_id}", response_model=schemas.StudentSchema)
def get_student(student_id: int, db: Session = Depends(get_db),
                current_user: models.User = Depends(auth.get_current_user)):
    s = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")

    if current_user.role == "TEACHER":
        teacher = db.query(models.Teacher).filter(models.Teacher.user_id == current_user.id).first()
        if teacher:
            assignments = db.query(models.TeacherSectionAssignment).filter(
                models.TeacherSectionAssignment.teacher_id == teacher.id).all()
            allowed = [a.section_id for a in assignments]
            if s.section_id not in allowed:
                raise HTTPException(status_code=403, detail="Not authorized to view this student")
    return s

@app.get("/students/{student_id}/details")
def get_student_details(student_id: int, db: Session = Depends(get_db),
                        current_user: models.User = Depends(auth.get_current_user)):
    s = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")

    if current_user.role == "TEACHER":
        teacher = db.query(models.Teacher).filter(models.Teacher.user_id == current_user.id).first()
        if not teacher:
            raise HTTPException(status_code=403, detail="Not authorized to view this student")
        assignments = db.query(models.TeacherSectionAssignment).filter(
            models.TeacherSectionAssignment.teacher_id == teacher.id).all()
        allowed = [a.section_id for a in assignments]
        if s.section_id not in allowed:
            raise HTTPException(status_code=403, detail="Not authorized to view this student")

    c = db.query(models.ClassModel).filter(models.ClassModel.id == s.class_id).first()
    sec = db.query(models.Section).filter(models.Section.id == s.section_id).first()
    att_records = db.query(models.Attendance).filter(models.Attendance.student_id == s.id).order_by(models.Attendance.attendance_date.desc()).all()

    present_count = len([a for a in att_records if a.status in ('Present', 'Late')])
    total_count = len(att_records)
    att_pct = int(round((present_count / total_count) * 100)) if total_count > 0 else 0

    consecutive_absents = 0
    for a in att_records:
        if a.status == 'Absent':
            consecutive_absents += 1
        else:
            break

    history = [
        {"attendance_date": str(a.attendance_date), "status": a.status, "leave_type": a.leave_type}
        for a in att_records[:7]
    ]

    return {
        "id": s.id,
        "roll_number": s.roll_number,
        "student_name": s.student_name,
        "class_name": c.class_name if c else "",
        "section_name": sec.section_name if sec else "",
        "parent_name": s.parent_name,
        "parent_phone": s.parent_phone,
        "teacher_remarks": s.teacher_remarks,
        "attendance_percentage": att_pct,
        "consecutive_absent": consecutive_absents,
        "history": history,
        "risk_reason": s.risk_reasons if s.risk_reasons else "No specific risks identified.",
        "risk_level": s.dropout_risk_level if s.dropout_risk_level else "Safe",
        "risk_score": s.dropout_risk_score if s.dropout_risk_score else 0,
        "counseling_flag": s.counseling_flag
    }

from pydantic import BaseModel
class CounselingUpdate(BaseModel):
    counseling_flag: bool

@app.patch("/students/{student_id}/counseling")
def update_counseling_flag(student_id: int, data: CounselingUpdate, db: Session = Depends(get_db),
                           current_user: models.User = Depends(auth.get_current_user)):
    s = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")
        
    if current_user.role == "TEACHER":
        teacher = db.query(models.Teacher).filter(models.Teacher.user_id == current_user.id).first()
        if not teacher:
            raise HTTPException(status_code=403, detail="Not authorized")
        assignments = db.query(models.TeacherSectionAssignment).filter(
            models.TeacherSectionAssignment.teacher_id == teacher.id).all()
        allowed = [a.section_id for a in assignments]
        if s.section_id not in allowed:
            raise HTTPException(status_code=403, detail="Not authorized to edit this student")
            
    s.counseling_flag = data.counseling_flag
    db.commit()
    
    return {"status": "success", "counseling_flag": s.counseling_flag}

@app.put("/students/{student_id}", response_model=schemas.StudentSchema)
def update_student(student_id: int, data: schemas.StudentUpdate, db: Session = Depends(get_db),
                   current_user: models.User = Depends(auth.get_current_user)):
    s = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")

    if current_user.role == "TEACHER":
        teacher = db.query(models.Teacher).filter(models.Teacher.user_id == current_user.id).first()
        if not teacher:
            raise HTTPException(status_code=403, detail="Not authorized")
        assignments = db.query(models.TeacherSectionAssignment).filter(
            models.TeacherSectionAssignment.teacher_id == teacher.id).all()
        allowed = [a.section_id for a in assignments]
        if s.section_id not in allowed:
            raise HTTPException(status_code=403, detail="Not authorized to edit this student")
        
        # Teachers can only update teacher_remarks and contact info
        allowed_updates = {"teacher_remarks", "parent_phone", "address"}
        for field, value in data.model_dump(exclude_unset=True).items():
            if field in allowed_updates:
                setattr(s, field, value)
                
        # Re-evaluate
        all_att = db.query(models.Attendance).filter(models.Attendance.student_id == s.id).all()
        present = sum(1 for a in all_att if a.status in ("Present", "Late"))
        att_pct = round(present / len(all_att) * 100, 1) if all_att else 100.0
        res = evaluate_student(s, att_pct)
        s.dropout_risk_score = res["dropout_risk_score"]
        s.dropout_risk_level = res["dropout_risk_level"]
        s.risk_reasons = res["risk_reasons"]
        s.last_evaluated_at = res["last_evaluated_at"]
        
        db.commit(); db.refresh(s)
        return s

    if current_user.role != "HEADMASTER":
        raise HTTPException(status_code=403, detail="Not authorized")

    if data.roll_number and data.roll_number != s.roll_number:
        if db.query(models.Student).filter(models.Student.roll_number == data.roll_number).first():
            raise HTTPException(status_code=400, detail="Roll number already exists")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(s, field, value)
        
    # Re-evaluate
    all_att = db.query(models.Attendance).filter(models.Attendance.student_id == s.id).all()
    present = sum(1 for a in all_att if a.status in ("Present", "Late"))
    att_pct = round(present / len(all_att) * 100, 1) if all_att else 100.0
    res = evaluate_student(s, att_pct)
    s.dropout_risk_score = res["dropout_risk_score"]
    s.dropout_risk_level = res["dropout_risk_level"]
    s.risk_reasons = res["risk_reasons"]
    s.last_evaluated_at = res["last_evaluated_at"]
        
    db.commit(); db.refresh(s)
    return s


@app.get("/high-risk")
def get_high_risk_students(
    class_id: Optional[int] = None,
    section_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    q = db.query(models.Student).filter(
        models.Student.dropout_risk_level == "High"
    )

    if current_user.role == "TEACHER":
        teacher = db.query(models.Teacher).filter(models.Teacher.user_id == current_user.id).first()
        if not teacher:
            return []
        assignments = db.query(models.TeacherSectionAssignment).filter(
            models.TeacherSectionAssignment.teacher_id == teacher.id).all()
        allowed_sections = [a.section_id for a in assignments]
        q = q.filter(models.Student.section_id.in_(allowed_sections))

    if class_id:
        q = q.filter(models.Student.class_id == class_id)
    if section_id:
        q = q.filter(models.Student.section_id == section_id)

    students = q.order_by(models.Student.dropout_risk_score.desc()).all()
    results = []
    for s in students:
        cls = db.query(models.ClassModel).filter(models.ClassModel.id == s.class_id).first()
        sec = db.query(models.Section).filter(models.Section.id == s.section_id).first()
        results.append({
            "id": s.id,
            "roll_number": s.roll_number,
            "student_name": s.student_name,
            "class_name": cls.class_name if cls else "",
            "section_name": sec.section_name if sec else "",
            "risk_score": round(s.dropout_risk_score, 1) if s.dropout_risk_score else 0,
            "risk_level": s.dropout_risk_level if s.dropout_risk_level else "Unknown",
            "reason": s.risk_reasons if s.risk_reasons else "Unknown"
        })
    return results


@app.delete("/students/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db),
                   current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role != "HEADMASTER":
        raise HTTPException(status_code=403, detail="Only headmaster can delete students")
    s = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")
    db.query(models.Attendance).filter(models.Attendance.student_id == student_id).delete()
    db.query(models.DropoutPrediction).filter(models.DropoutPrediction.student_id == student_id).delete()
    db.delete(s); db.commit()
    return {"status": "deleted"}


# ── COUNSELING ROSTER ─────────────────────────────────────────────────────────

@app.get("/counseling-roster")
def get_counseling_roster(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    q = db.query(models.Student).filter(models.Student.counseling_flag == True)

    if current_user.role == "TEACHER":
        teacher = db.query(models.Teacher).filter(models.Teacher.user_id == current_user.id).first()
        if not teacher:
            return []
        assignments = db.query(models.TeacherSectionAssignment).filter(
            models.TeacherSectionAssignment.teacher_id == teacher.id).all()
        allowed_sections = [a.section_id for a in assignments]
        q = q.filter(models.Student.section_id.in_(allowed_sections))

    students = q.order_by(models.Student.student_name).all()
    results = []
    for s in students:
        cls = db.query(models.ClassModel).filter(models.ClassModel.id == s.class_id).first()
        sec = db.query(models.Section).filter(models.Section.id == s.section_id).first()
        results.append({
            "id": s.id,
            "roll_number": s.roll_number,
            "student_name": s.student_name,
            "class_name": cls.class_name if cls else "",
            "section_name": sec.section_name if sec else "",
            "risk_score": round(s.dropout_risk_score, 1) if s.dropout_risk_score else 0,
            "risk_level": s.dropout_risk_level if s.dropout_risk_level else "Unknown",
            "parent_name": s.parent_name,
            "parent_phone": s.parent_phone,
            "counseling_flag": s.counseling_flag,
        })
    return results


# ── ATTENDANCE BULK SUBMISSION ────────────────────────────────────────────────

class AttendanceRecord(schemas.BaseModel if hasattr(schemas, 'BaseModel') else object):
    pass

from pydantic import BaseModel as _PydanticBase
class AttendanceRecordItem(_PydanticBase):
    student_id: int
    status: str
    attendance_date: str

class BulkAttendancePayload(_PydanticBase):
    records: List[AttendanceRecordItem]

@app.post("/attendance/bulk")
def submit_bulk_attendance(
    payload: BulkAttendancePayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    allowed_student_ids = None
    if current_user.role == "TEACHER":
        teacher = db.query(models.Teacher).filter(models.Teacher.user_id == current_user.id).first()
        if not teacher:
            raise HTTPException(status_code=403, detail="Teacher profile not found")
        assignments = db.query(models.TeacherSectionAssignment).filter(
            models.TeacherSectionAssignment.teacher_id == teacher.id).all()
        allowed_sections = [a.section_id for a in assignments]
        allowed_students = db.query(models.Student).filter(
            models.Student.section_id.in_(allowed_sections)).all()
        allowed_student_ids = {s.id for s in allowed_students}

    saved_count = 0
    for rec in payload.records:
        if allowed_student_ids is not None and rec.student_id not in allowed_student_ids:
            continue

        try:
            att_date = date.fromisoformat(rec.attendance_date)
        except ValueError:
            continue

        existing = db.query(models.Attendance).filter(
            models.Attendance.student_id == rec.student_id,
            models.Attendance.attendance_date == att_date
        ).first()

        if existing:
            existing.status = rec.status
        else:
            db.add(models.Attendance(
                student_id=rec.student_id,
                attendance_date=att_date,
                status=rec.status,
                check_in_time=None,
            ))
        saved_count += 1

    db.commit()
    return {"status": "success", "saved": saved_count}


# ── TEACHERS ──────────────────────────────────────────────────────────────────


@app.get("/teachers")
def get_teachers(db: Session = Depends(get_db),
                 current_user: models.User = Depends(auth.get_current_user)):
    teachers = db.query(models.Teacher).all()
    result = []
    for t in teachers:
        t_user = db.query(models.User).filter(models.User.id == t.user_id).first()
        assignments = db.query(models.TeacherSectionAssignment).filter(
            models.TeacherSectionAssignment.teacher_id == t.id).all()
        assigned = []
        for a in assignments:
            sec = db.query(models.Section).filter(models.Section.id == a.section_id).first()
            cls = db.query(models.ClassModel).filter(models.ClassModel.id == sec.class_id).first() if sec else None
            assigned.append({
                "assignment_id": a.id,
                "section_id": a.section_id,
                "section_name": sec.section_name if sec else "",
                "class_id": cls.id if cls else None,
                "class_name": cls.class_name if cls else "",
            })
        result.append({
            "id": t.id,
            "user_id": t.user_id,
            "employee_id": t.employee_id,
            "phone": t.phone,
            "full_name": t_user.full_name if t_user else "",
            "email": t_user.email if t_user else "",
            "assignments": assigned,
        })
    return result


@app.post("/teachers")
def create_teacher(data: schemas.TeacherCreate, db: Session = Depends(get_db),
                   current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role != "HEADMASTER":
        raise HTTPException(status_code=403, detail="Only headmaster can add teachers")
    if db.query(models.User).filter(models.User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(models.Teacher).filter(models.Teacher.employee_id == data.employee_id).first():
        raise HTTPException(status_code=400, detail="Employee ID already exists")

    t_user = models.User(
        full_name=data.full_name, email=data.email,
        password_hash=auth.get_password_hash(data.password), role="TEACHER")
    db.add(t_user); db.commit(); db.refresh(t_user)

    teacher = models.Teacher(user_id=t_user.id, employee_id=data.employee_id, phone=data.phone)
    db.add(teacher); db.commit(); db.refresh(teacher)

    for sid in data.section_ids:
        db.add(models.TeacherSectionAssignment(teacher_id=teacher.id, section_id=sid))
    db.commit()

    # Notify headmaster
    hm = db.query(models.User).filter(models.User.role == "HEADMASTER").first()
    if hm:
        db.add(models.Notification(
            title="New Teacher Added",
            message=f"{data.full_name} (Employee ID: {data.employee_id}) has been added to the system.",
            user_id=hm.id, is_read=False))
        db.commit()

    return {"status": "created", "teacher_id": teacher.id, "user_id": t_user.id}


@app.put("/teachers/{teacher_id}")
def update_teacher(teacher_id: int, data: schemas.TeacherUpdate, db: Session = Depends(get_db),
                   current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role != "HEADMASTER":
        raise HTTPException(status_code=403, detail="Only headmaster can edit teachers")
    teacher = db.query(models.Teacher).filter(models.Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    t_user = db.query(models.User).filter(models.User.id == teacher.user_id).first()

    if data.full_name and t_user:
        t_user.full_name = data.full_name
    if data.email and t_user:
        t_user.email = data.email
    if data.password:
        t_user.password_hash = auth.get_password_hash(data.password)
    if data.phone is not None:
        teacher.phone = data.phone
    if data.employee_id:
        teacher.employee_id = data.employee_id
    if data.section_ids is not None:
        db.query(models.TeacherSectionAssignment).filter(
            models.TeacherSectionAssignment.teacher_id == teacher_id).delete()
        for sid in data.section_ids:
            db.add(models.TeacherSectionAssignment(teacher_id=teacher_id, section_id=sid))
    db.commit()
    return {"status": "updated"}


@app.delete("/teachers/{teacher_id}")
def delete_teacher(teacher_id: int, db: Session = Depends(get_db),
                   current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role != "HEADMASTER":
        raise HTTPException(status_code=403, detail="Only headmaster can delete teachers")
    teacher = db.query(models.Teacher).filter(models.Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    db.query(models.TeacherSectionAssignment).filter(
        models.TeacherSectionAssignment.teacher_id == teacher_id).delete()
    user_id = teacher.user_id
    db.delete(teacher); db.commit()
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        db.query(models.Notification).filter(models.Notification.user_id == user_id).delete()
        db.delete(user); db.commit()
    return {"status": "deleted"}


# ── TEACHER-SPECIFIC ──────────────────────────────────────────────────────────

@app.get("/teacher/students")
def get_teacher_students(
    search: Optional[str] = None,
    section_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if current_user.role != "TEACHER":
        raise HTTPException(status_code=403, detail="Not authorized")
    teacher = db.query(models.Teacher).filter(models.Teacher.user_id == current_user.id).first()
    if not teacher:
        return []
    assignments = db.query(models.TeacherSectionAssignment).filter(
        models.TeacherSectionAssignment.teacher_id == teacher.id).all()
    allowed_section_ids = [a.section_id for a in assignments]

    q = db.query(models.Student).filter(models.Student.section_id.in_(allowed_section_ids))
    if section_id and section_id in allowed_section_ids:
        q = q.filter(models.Student.section_id == section_id)
    if search:
        q = q.filter(
            models.Student.student_name.ilike(f"%{search}%") |
            models.Student.roll_number.ilike(f"%{search}%")
        )
    students = q.order_by(models.Student.student_name).all()
    return [{"id": s.id, "roll_number": s.roll_number, "student_name": s.student_name,
             "gender": s.gender, "class_id": s.class_id, "section_id": s.section_id,
             "parent_name": s.parent_name, "parent_phone": s.parent_phone} for s in students]


@app.get("/teacher/analytics")
def get_teacher_analytics(db: Session = Depends(get_db),
                          current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role != "TEACHER":
        raise HTTPException(status_code=403, detail="Not authorized")
    teacher = db.query(models.Teacher).filter(models.Teacher.user_id == current_user.id).first()
    if not teacher:
        return {"labels": [], "present": [], "absent": [], "rate": []}

    assignments = db.query(models.TeacherSectionAssignment).filter(
        models.TeacherSectionAssignment.teacher_id == teacher.id).all()
    section_ids = [a.section_id for a in assignments]
    students = db.query(models.Student).filter(models.Student.section_id.in_(section_ids)).all()
    student_ids = [s.id for s in students]
    total = len(student_ids)

    school_days = get_school_days(30)
    labels, present_data, absent_data, rate_data = [], [], [], []
    for d in school_days:
        att = db.query(models.Attendance).filter(
            models.Attendance.student_id.in_(student_ids),
            models.Attendance.attendance_date == d).all()
        p = sum(1 for a in att if a.status in ("Present", "Late"))
        ab = sum(1 for a in att if a.status == "Absent")
        rate = round(p / total * 100, 1) if total > 0 and att else 0
        labels.append(d.strftime("%b %d"))
        present_data.append(p)
        absent_data.append(ab)
        rate_data.append(rate)

    predictions = db.query(models.DropoutPrediction).filter(
        models.DropoutPrediction.student_id.in_(student_ids)).all()
    risk = {
        "High": sum(1 for p in predictions if p.risk_level == "High"),
        "Medium": sum(1 for p in predictions if p.risk_level == "Medium"),
        "Low": sum(1 for p in predictions if p.risk_level == "Low"),
        "Safe": sum(1 for p in predictions if p.risk_level == "Safe"),
    }
    return {"labels": labels, "present": present_data, "absent": absent_data,
            "rate": rate_data, "risk": risk}


@app.get("/teacher/dashboard")
def get_teacher_dashboard(
    class_id: Optional[int] = Query(None, alias="class"),
    section_id: Optional[int] = Query(None, alias="section"),
    filter_date: Optional[date] = Query(None, alias="date"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if current_user.role != "TEACHER":
        raise HTTPException(status_code=403, detail="Not authorized")

    teacher = db.query(models.Teacher).filter(models.Teacher.user_id == current_user.id).first()
    if not teacher:
        teacher = models.Teacher(user_id=current_user.id, employee_id=f"EMP-{current_user.id}")
        db.add(teacher); db.commit(); db.refresh(teacher)

    assignments = db.query(models.TeacherSectionAssignment).filter(
        models.TeacherSectionAssignment.teacher_id == teacher.id).all()
    section_ids = [a.section_id for a in assignments]

    student_q = db.query(models.Student).filter(models.Student.section_id.in_(section_ids))
    if class_id:
        student_q = student_q.filter(models.Student.class_id == class_id)
    if section_id:
        student_q = student_q.filter(models.Student.section_id == section_id)
        
    students = student_q.all()
    student_ids = [s.id for s in students]
    total_students = len(students)

    target_date = filter_date if filter_date else datetime.now().date()
    
    attendance_today = []
    if student_ids:
        attendance_today = db.query(models.Attendance).filter(
            models.Attendance.student_id.in_(student_ids),
            models.Attendance.attendance_date == target_date).all()

    present_count = sum(1 for a in attendance_today if a.status in ("Present", "Late"))
    absent_count  = sum(1 for a in attendance_today if a.status == "Absent")
    attendance_rate = (present_count / total_students * 100) if total_students > 0 else 0

    high_risk = sum(1 for s in students if s.dropout_risk_level == "High")

    high_risk_students = []
    hr_students = [s for s in students if s.dropout_risk_level == "High"]
    for s in sorted(hr_students, key=lambda x: x.dropout_risk_score if x.dropout_risk_score else 0, reverse=True)[:10]:
        high_risk_students.append({
            "id": s.id,
            "student_id": s.roll_number, "name": s.student_name,
            "risk_score": round(s.dropout_risk_score, 1) if s.dropout_risk_score else 0,
            "risk_level": "RED",
            "reasons": s.risk_reasons})

    absent_today_students = []
    for a in [x for x in attendance_today if x.status == "Absent"]:
        s = next((x for x in students if x.id == a.student_id), None)
        if s:
            absent_today_students.append({
                "student_id": s.roll_number, "name": s.student_name,
                "risk_level": s.dropout_risk_level if s.dropout_risk_level else "Low",
                "consecutive_absence": 1,
                "parent_phone": s.parent_phone})

    # Weekly graph — last 7 school days
    graph_days = get_school_days(7)
    graph_labels = [gd.strftime("%a %d") for gd in graph_days]
    graph_present, graph_absent = [], []
    for gd in graph_days:
        day_att = db.query(models.Attendance).filter(
            models.Attendance.student_id.in_(student_ids),
            models.Attendance.attendance_date == gd).all()
        graph_present.append(sum(1 for a in day_att if a.status in ("Present", "Late")))
        graph_absent.append(sum(1 for a in day_att if a.status == "Absent"))

    assigned_sections = []
    for a in assignments:
        sec = db.query(models.Section).filter(models.Section.id == a.section_id).first()
        cls = db.query(models.ClassModel).filter(models.ClassModel.id == sec.class_id).first() if sec else None
        assigned_sections.append({
            "section_id": a.section_id,
            "section_name": sec.section_name if sec else "",
            "class_id": cls.id if cls else None,
            "class_name": cls.class_name if cls else "",
            "label": f"{cls.class_name if cls else ''} - Sec {sec.section_name if sec else ''}",
        })

    return {
        "total_students": total_students,
        "present_today": present_count,
        "attendance_rate_today": round(attendance_rate, 1),
        "absent_today": absent_count,
        "high_risk_count": high_risk,
        "high_risk_students": high_risk_students,
        "weekly_attendance_graph": {
            "labels": graph_labels,
            "datasets": [
                {"label": "Present", "data": graph_present},
                {"label": "Absent",  "data": graph_absent},
            ],
        },
        "absent_students": absent_today_students,
        "assigned_sections": assigned_sections,
        "assigned_students": [{"id": s.id, "name": s.student_name, "roll": s.roll_number}
                               for s in students],
    }


# ── HEADMASTER DASHBOARD ──────────────────────────────────────────────────────

@app.get("/headmaster/dashboard")
def get_headmaster_dashboard(
    class_id: Optional[int] = Query(None, alias="class"),
    section_id: Optional[int] = Query(None, alias="section"),
    teacher_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if current_user.role != "HEADMASTER":
        raise HTTPException(status_code=403, detail="Not authorized")

    # Filter base query for students
    student_q = db.query(models.Student)
    if class_id:
        student_q = student_q.filter(models.Student.class_id == class_id)
    if section_id:
        student_q = student_q.filter(models.Student.section_id == section_id)
    if teacher_id:
        asgns = db.query(models.TeacherSectionAssignment).filter(
            models.TeacherSectionAssignment.teacher_id == teacher_id).all()
        allowed_sections = [a.section_id for a in asgns]
        student_q = student_q.filter(models.Student.section_id.in_(allowed_sections))
        
    students = student_q.all()
    student_ids = [s.id for s in students]
    total_students = len(students)
    
    # Filter base query for teachers
    teacher_q = db.query(models.Teacher)
    if teacher_id:
        teacher_q = teacher_q.filter(models.Teacher.id == teacher_id)
    total_teachers = teacher_q.count()

    today = datetime.now().date()
    sd = start_date if start_date else (today - timedelta(days=7))
    ed = end_date if end_date else today

    recent_att_q = db.query(models.Attendance).filter(
        models.Attendance.attendance_date >= sd,
        models.Attendance.attendance_date <= ed
    )
    if student_ids:
        recent_att_q = recent_att_q.filter(models.Attendance.student_id.in_(student_ids))
    elif total_students == 0:
        # Optimization: no students match the filter, so no attendance matches
        recent_att_q = recent_att_q.filter(False)
        
    recent_att = recent_att_q.all()
    present_count = sum(1 for a in recent_att if a.status in ("Present", "Late"))
    attendance_rate = (present_count / len(recent_att) * 100) if recent_att else 0

    risk_counts = {"High": 0, "Medium": 0, "Low": 0, "Safe": 0}
    last_evaluated_at = None
    for s in students:
        level = s.dropout_risk_level if s.dropout_risk_level else "Safe"
        if level in risk_counts:
            risk_counts[level] += 1
        
        if s.last_evaluated_at:
            if not last_evaluated_at or s.last_evaluated_at > last_evaluated_at:
                last_evaluated_at = s.last_evaluated_at

    top_risk_students = []
    # students dict for fast lookup
    high_risk = [s for s in students if s.dropout_risk_level == "High"]
    for s in sorted(high_risk, key=lambda x: x.dropout_risk_score if x.dropout_risk_score else 0, reverse=True)[:10]:
        cls = db.query(models.ClassModel).filter(models.ClassModel.id == s.class_id).first()
        sec = db.query(models.Section).filter(models.Section.id == s.section_id).first()
        top_risk_students.append({
            "id": s.id,
            "student_id": s.roll_number, "name": s.student_name,
            "class_section": f"{cls.class_name if cls else ''} - Sec {sec.section_name if sec else ''}",
            "risk_score": round(s.dropout_risk_score, 1) if s.dropout_risk_score else 0,
            "risk_level": "RED",
            "reasons": s.risk_reasons})

    all_classes_q = db.query(models.ClassModel)
    if class_id:
        all_classes_q = all_classes_q.filter(models.ClassModel.id == class_id)
    all_classes = all_classes_q.all()
    
    class_attendance_comparison = []
    for cls in all_classes:
        # filter student_ids by this class
        cls_ids = [s.id for s in students if s.class_id == cls.id]
        if not cls_ids:
            continue
        cls_att = db.query(models.Attendance).filter(
            models.Attendance.student_id.in_(cls_ids),
            models.Attendance.attendance_date >= sd,
            models.Attendance.attendance_date <= ed).all()
        cls_p = sum(1 for a in cls_att if a.status in ("Present", "Late"))
        cls_rate = round(cls_p / len(cls_att) * 100, 1) if cls_att else 0
        class_attendance_comparison.append({
            "class_name": cls.class_name, "attendance_rate": cls_rate,
            "student_count": len(cls_ids)})

    teacher_attendance_summary = []
    for teacher in teacher_q.all():
        t_user = db.query(models.User).filter(models.User.id == teacher.user_id).first()
        asgns = db.query(models.TeacherSectionAssignment).filter(
            models.TeacherSectionAssignment.teacher_id == teacher.id).all()
        parts = []
        for a in asgns:
            sec = db.query(models.Section).filter(models.Section.id == a.section_id).first()
            cls = db.query(models.ClassModel).filter(models.ClassModel.id == sec.class_id).first() if sec else None
            parts.append(f"{cls.class_name if cls else ''} - Sec {sec.section_name if sec else ''}")
        teacher_attendance_summary.append({
            "teacher_name": t_user.full_name if t_user else "Unknown",
            "assigned_class": ", ".join(parts) if parts else "Unassigned",
            "status": "Present", "time": "08:15 AM"})

    return {
        "total_students": total_students,
        "total_teachers": total_teachers,
        "school_attendance_rate": round(attendance_rate, 1),
        "risk_breakdown": {
            "RED": risk_counts["High"], "ORANGE": risk_counts["Medium"],
            "YELLOW": risk_counts["Low"], "SAFE": risk_counts["Safe"]},
        "top_risk_students": top_risk_students,
        "class_attendance_comparison": class_attendance_comparison,
        "teacher_attendance_summary": teacher_attendance_summary,
        "last_evaluated_at": last_evaluated_at.isoformat() if last_evaluated_at else None,
    }


from pydantic import BaseModel

class ManualPredictRequest(BaseModel):
    roll_number: str

# ── AI PREDICTION ENGINE ──────────────────────────────────────────────────────

@app.get("/ai/status")
def get_ai_status(db: Session = Depends(get_db)):
    max_date = db.query(func.max(models.Student.last_evaluated_at)).scalar()
    return {"last_evaluated_at": max_date.isoformat() if max_date else None}

@app.post("/ai/evaluate-all")
def evaluate_all_students(db: Session = Depends(get_db)):
    try:
        students = db.query(models.Student).all()
        for s in students:
            all_att = db.query(models.Attendance).filter(models.Attendance.student_id == s.id).all()
            present = sum(1 for a in all_att if a.status in ("Present", "Late"))
            att_pct = round(present / len(all_att) * 100, 1) if all_att else 100.0
            
            res = evaluate_student(s, att_pct)
            s.dropout_risk_score = res["dropout_risk_score"]
            s.dropout_risk_level = res["dropout_risk_level"]
            s.risk_reasons = res["risk_reasons"]
            s.last_evaluated_at = res["last_evaluated_at"]
        db.commit()
        
        max_date = db.query(func.max(models.Student.last_evaluated_at)).scalar()
        return {"success": True, "message": f"Evaluated {len(students)} students", "last_evaluated_at": max_date.isoformat() if max_date else None}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/predict")
def manual_predict(req: ManualPredictRequest, db: Session = Depends(get_db)):
    clean_roll = req.roll_number.strip().upper()
    s = db.query(models.Student).filter(func.upper(models.Student.roll_number) == clean_roll).first()
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")
        
    all_att = db.query(models.Attendance).filter(models.Attendance.student_id == s.id).all()
    present = sum(1 for a in all_att if a.status in ("Present", "Late"))
    att_pct = round(present / len(all_att) * 100, 1) if all_att else 100.0
    
    res = evaluate_student(s, att_pct)
    s.dropout_risk_score = res["dropout_risk_score"]
    s.dropout_risk_level = res["dropout_risk_level"]
    s.risk_reasons = res["risk_reasons"]
    s.last_evaluated_at = res["last_evaluated_at"]
    db.commit()
    
    return {
        "student_name": s.student_name,
        "roll_number": s.roll_number,
        "dropout_risk_score": s.dropout_risk_score,
        "dropout_risk_level": s.dropout_risk_level,
        "risk_reasons": s.risk_reasons
    }

@app.post("/seed-ai-test-data")
def seed_ai_test_data(db: Session = Depends(get_db)):
    # 1. Ensure a class and section exist for dummy data
    cls = db.query(models.ClassModel).first()
    if not cls:
        cls = models.ClassModel(class_name="10")
        db.add(cls)
        db.commit()
        db.refresh(cls)
        
    sec = db.query(models.Section).filter(models.Section.class_id == cls.id).first()
    if not sec:
        sec = models.Section(class_id=cls.id, section_name="A")
        db.add(sec)
        db.commit()
        db.refresh(sec)
        
    # Dummy profiles
    profiles = [
        {
            "roll_number": "AI-TEST-001",
            "student_name": "Ravi Kumar (High Risk)",
            "attendance_pct": 60.0,
            "grade_drop_pct": 15.0,
            "commute_distance_km": 12.0,
            "income_bracket": "Low"
        },
        {
            "roll_number": "AI-TEST-002",
            "student_name": "Priya Sharma (Medium Risk)",
            "attendance_pct": 80.0,
            "grade_drop_pct": 5.0,
            "commute_distance_km": 8.0,
            "income_bracket": "Medium"
        },
        {
            "roll_number": "AI-TEST-003",
            "student_name": "Arjun Patel (Low Risk)",
            "attendance_pct": 98.0,
            "grade_drop_pct": 0.0,
            "commute_distance_km": 2.0,
            "income_bracket": "High"
        }
    ]
    
    inserted = []
    for p in profiles:
        s = db.query(models.Student).filter(models.Student.roll_number == p["roll_number"]).first()
        if not s:
            s = models.Student(
                roll_number=p["roll_number"],
                student_name=p["student_name"],
                gender="Other",
                dob=date(2010, 1, 1),
                class_id=cls.id,
                section_id=sec.id,
                grade_drop_pct=p["grade_drop_pct"],
                commute_distance_km=p["commute_distance_km"],
                income_bracket=p["income_bracket"]
            )
            db.add(s)
            db.commit()
            db.refresh(s)
            
        res = evaluate_student(s, p["attendance_pct"])
        s.dropout_risk_score = res["dropout_risk_score"]
        s.dropout_risk_level = res["dropout_risk_level"]
        s.risk_reasons = res["risk_reasons"]
        s.last_evaluated_at = res["last_evaluated_at"]
        db.commit()
        inserted.append(s.roll_number)
        
    return {"message": "Test data seeded successfully", "students": inserted}


# ── ANALYTICS ─────────────────────────────────────────────────────────────────

@app.get("/analytics/attendance")
def get_attendance_analytics(days: int = 30, db: Session = Depends(get_db),
                             current_user: models.User = Depends(auth.get_current_user)):
    school_days = get_school_days(min(days, 60))
    total = db.query(models.Student).count()
    labels, present_data, absent_data, rate_data = [], [], [], []
    for d in school_days:
        att = db.query(models.Attendance).filter(models.Attendance.attendance_date == d).all()
        p = sum(1 for a in att if a.status in ("Present", "Late"))
        ab = sum(1 for a in att if a.status == "Absent")
        labels.append(d.strftime("%b %d"))
        present_data.append(p)
        absent_data.append(ab)
        rate_data.append(round(p / total * 100, 1) if total and att else 0)
    return {"labels": labels, "present": present_data, "absent": absent_data, "rate": rate_data}


@app.get("/analytics/class-wise")
def get_class_wise_analytics(db: Session = Depends(get_db),
                             current_user: models.User = Depends(auth.get_current_user)):
    week_ago = date.today() - timedelta(days=7)
    result = []
    for cls in db.query(models.ClassModel).order_by(models.ClassModel.id).all():
        ids = [s.id for s in db.query(models.Student).filter(models.Student.class_id == cls.id).all()]
        if not ids:
            continue
        att = db.query(models.Attendance).filter(
            models.Attendance.student_id.in_(ids),
            models.Attendance.attendance_date >= week_ago).all()
        p = sum(1 for a in att if a.status in ("Present", "Late"))
        result.append({
            "class_name": cls.class_name,
            "attendance_rate": round(p / len(att) * 100, 1) if att else 0,
            "student_count": len(ids)})
    return result


@app.get("/analytics/section-wise")
def get_section_wise_analytics(db: Session = Depends(get_db),
                               current_user: models.User = Depends(auth.get_current_user)):
    week_ago = date.today() - timedelta(days=7)
    result = []
    for cls in db.query(models.ClassModel).order_by(models.ClassModel.id).all():
        for sec in db.query(models.Section).filter(models.Section.class_id == cls.id).all():
            ids = [s.id for s in db.query(models.Student).filter(models.Student.section_id == sec.id).all()]
            if not ids:
                continue
            att = db.query(models.Attendance).filter(
                models.Attendance.student_id.in_(ids),
                models.Attendance.attendance_date >= week_ago).all()
            p = sum(1 for a in att if a.status in ("Present", "Late"))
            result.append({
                "label": f"{cls.class_name} - {sec.section_name}",
                "attendance_rate": round(p / len(att) * 100, 1) if att else 0,
                "student_count": len(ids)})
    return result


# ── NOTIFICATIONS ─────────────────────────────────────────────────────────────

@app.get("/notifications/")
def get_notifications(db: Session = Depends(get_db),
                      current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id
    ).order_by(models.Notification.created_at.desc()).all()


@app.post("/notifications/read-all")
def read_all_notifications(db: Session = Depends(get_db),
                           current_user: models.User = Depends(auth.get_current_user)):
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id
    ).update({"is_read": True})
    db.commit()
    return {"status": "success"}


@app.put("/notifications/{notif_id}/read")
def read_notification(notif_id: int, db: Session = Depends(get_db),
                      current_user: models.User = Depends(auth.get_current_user)):
    notif = db.query(models.Notification).filter(
        models.Notification.id == notif_id,
        models.Notification.user_id == current_user.id).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"status": "success"}


@app.delete("/notifications/{notif_id}")
def delete_notification(notif_id: int, db: Session = Depends(get_db),
                        current_user: models.User = Depends(auth.get_current_user)):
    notif = db.query(models.Notification).filter(
        models.Notification.id == notif_id,
        models.Notification.user_id == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(notif); db.commit()
    return {"status": "deleted"}


# ── EXPORT (CSV) ──────────────────────────────────────────────────────────────

@app.get("/export/students")
def export_students(db: Session = Depends(get_db),
                    current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role == "HEADMASTER":
        students = db.query(models.Student).all()
    else:
        teacher = db.query(models.Teacher).filter(models.Teacher.user_id == current_user.id).first()
        if not teacher:
            students = []
        else:
            asgns = db.query(models.TeacherSectionAssignment).filter(
                models.TeacherSectionAssignment.teacher_id == teacher.id).all()
            sec_ids = [a.section_id for a in asgns]
            students = db.query(models.Student).filter(models.Student.section_id.in_(sec_ids)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Roll Number", "Name", "Gender", "DOB", "Class", "Section",
                     "Admission No", "Parent Name", "Parent Phone", "Address"])
    for s in students:
        cls = db.query(models.ClassModel).filter(models.ClassModel.id == s.class_id).first()
        sec = db.query(models.Section).filter(models.Section.id == s.section_id).first()
        writer.writerow([s.roll_number, s.student_name, s.gender, s.dob,
                         cls.class_name if cls else "", sec.section_name if sec else "",
                         s.admission_number or "", s.parent_name, s.parent_phone, s.address])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=students.csv"})


@app.get("/export/attendance")
def export_attendance(db: Session = Depends(get_db),
                      current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role == "HEADMASTER":
        records = db.query(models.Attendance).order_by(
            models.Attendance.attendance_date.desc()).limit(5000).all()
    else:
        teacher = db.query(models.Teacher).filter(models.Teacher.user_id == current_user.id).first()
        if not teacher:
            records = []
        else:
            asgns = db.query(models.TeacherSectionAssignment).filter(
                models.TeacherSectionAssignment.teacher_id == teacher.id).all()
            sec_ids = [a.section_id for a in asgns]
            student_ids = [s.id for s in db.query(models.Student).filter(
                models.Student.section_id.in_(sec_ids)).all()]
            records = db.query(models.Attendance).filter(
                models.Attendance.student_id.in_(student_ids)
            ).order_by(models.Attendance.attendance_date.desc()).limit(5000).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Student ID", "Student Name", "Date", "Status", "Check-In Time"])
    for r in records:
        s = db.query(models.Student).filter(models.Student.id == r.student_id).first()
        writer.writerow([s.roll_number if s else r.student_id,
                         s.student_name if s else "", r.attendance_date,
                         r.status, r.check_in_time or ""])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=attendance.csv"})


# ── ATTENDANCE DASHBOARD ─────────────────────────────────────────────────────────────

@app.get("/attendance/details")
def get_attendance_details(
    class_id: Optional[int] = None,
    section_id: Optional[int] = None,
    teacher_id: Optional[int] = None,
    filter_date: Optional[date] = None,
    status: Optional[str] = None,
    leave_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    q = db.query(models.Attendance, models.Student, models.ClassModel, models.Section)\
        .join(models.Student, models.Attendance.student_id == models.Student.id)\
        .outerjoin(models.ClassModel, models.Student.class_id == models.ClassModel.id)\
        .outerjoin(models.Section, models.Student.section_id == models.Section.id)
    
    if current_user.role == "TEACHER":
        teacher = db.query(models.Teacher).filter(models.Teacher.user_id == current_user.id).first()
        if not teacher:
            return []
        asgns = db.query(models.TeacherSectionAssignment).filter(
            models.TeacherSectionAssignment.teacher_id == teacher.id).all()
        allowed = [a.section_id for a in asgns]
        q = q.filter(models.Student.section_id.in_(allowed))
    elif teacher_id:
        asgns = db.query(models.TeacherSectionAssignment).filter(
            models.TeacherSectionAssignment.teacher_id == teacher_id).all()
        allowed = [a.section_id for a in asgns]
        q = q.filter(models.Student.section_id.in_(allowed))

    if class_id:
        q = q.filter(models.Student.class_id == class_id)
    if section_id:
        q = q.filter(models.Student.section_id == section_id)
    if filter_date:
        # Use str() for SQLite date comparison if needed, but SQLAlchemy handles it
        q = q.filter(models.Attendance.attendance_date == filter_date)
    if status:
        q = q.filter(models.Attendance.status == status)
    if leave_type:
        q = q.filter(models.Attendance.leave_type == leave_type)
        
    records = q.order_by(models.Attendance.attendance_date.desc(), models.Student.student_name).all()
    
    if not records:
        return []

    # Pre-fetch attendance stats to avoid N+1 inside the loop
    student_ids = list(set(r.Student.id for r in records))
    all_att = db.query(models.Attendance.student_id, models.Attendance.status).filter(
        models.Attendance.student_id.in_(student_ids)
    ).all()
    
    stats = {sid: {'total': 0, 'present': 0} for sid in student_ids}
    for att_sid, att_status in all_att:
        stats[att_sid]['total'] += 1
        if att_status in ('Present', 'Late'):
            stats[att_sid]['present'] += 1
            
    results = []
    for att, student, cls, sec in records:
        st = stats[student.id]
        total = st['total']
        present = st['present']
        att_pct = int(round((present / total) * 100)) if total > 0 else 0
        
        results.append({
            "id": att.id,
            "student_id": student.id,
            "roll_number": student.roll_number,
            "student_name": student.student_name,
            "class_name": cls.class_name if cls else "",
            "section_name": sec.section_name if sec else "",
            "date": str(att.attendance_date),
            "status": att.status,
            "leave_type": att.leave_type or "",
            "attendance_percentage": att_pct,
            "risk_level": student.dropout_risk_level if student.dropout_risk_level else "Safe"
        })
        
    return results

@app.get("/attendance/analytics")
def get_attendance_analytics(
    class_id: Optional[int] = None,
    section_id: Optional[int] = None,
    teacher_id: Optional[int] = None,
    filter_date: Optional[date] = None,
    status: Optional[str] = None,
    leave_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    q = db.query(models.Attendance, models.Student)\
        .join(models.Student, models.Attendance.student_id == models.Student.id)
    
    if current_user.role == "TEACHER":
        teacher = db.query(models.Teacher).filter(models.Teacher.user_id == current_user.id).first()
        if not teacher:
            return {"total": 0, "present": 0, "absent": 0, "leave": 0, "rate": 0, "class_wise": {}, "section_wise": {}, "high_risk_count": 0}
        asgns = db.query(models.TeacherSectionAssignment).filter(
            models.TeacherSectionAssignment.teacher_id == teacher.id).all()
        allowed = [a.section_id for a in asgns]
        q = q.filter(models.Student.section_id.in_(allowed))
    elif teacher_id:
        asgns = db.query(models.TeacherSectionAssignment).filter(
            models.TeacherSectionAssignment.teacher_id == teacher_id).all()
        allowed = [a.section_id for a in asgns]
        q = q.filter(models.Student.section_id.in_(allowed))

    if class_id:
        q = q.filter(models.Student.class_id == class_id)
    if section_id:
        q = q.filter(models.Student.section_id == section_id)
    if filter_date:
        q = q.filter(models.Attendance.attendance_date == filter_date)
    if status:
        q = q.filter(models.Attendance.status == status)
    if leave_type:
        q = q.filter(models.Attendance.leave_type == leave_type)
        
    records = q.all()
    
    total_records = len(records)
    present = sum(1 for att, s in records if att.status in ('Present', 'Late'))
    absent = sum(1 for att, s in records if att.status == 'Absent')
    leave = sum(1 for att, s in records if att.status == 'Leave')
    rate = int(round((present / total_records) * 100)) if total_records > 0 else 0
    
    # Calculate high risk among the filtered students
    # We first collect student IDs in this filtered set
    student_ids_in_filter = list(set(s.id for att, s in records))
    total_students = len(student_ids_in_filter)
    high_risk_count = 0
    if student_ids_in_filter:
        high_risk_count = db.query(models.Student).filter(
            models.Student.id.in_(student_ids_in_filter),
            models.Student.dropout_risk_level == "High"
        ).count()
    
    # Class-wise & Section-wise Breakdown
    class_wise = {}
    section_wise = {}
    
    if len(records) > 0:
        cls_map = {c.id: c.class_name for c in db.query(models.ClassModel).all()}
        sec_map = {s.id: (s.section_name, s.class_id) for s in db.query(models.Section).all()}
        
        # Group by class
        for att, st in records:
            c_name = cls_map.get(st.class_id, "Unknown Class")
            if c_name not in class_wise:
                class_wise[c_name] = {'total': 0, 'present': 0}
            class_wise[c_name]['total'] += 1
            if att.status in ('Present', 'Late'):
                class_wise[c_name]['present'] += 1
                
            s_name = sec_map.get(st.section_id, ("Unknown Section", 0))[0]
            sec_key = f"{c_name} - {s_name}"
            if sec_key not in section_wise:
                section_wise[sec_key] = {'total': 0, 'present': 0}
            section_wise[sec_key]['total'] += 1
            if att.status in ('Present', 'Late'):
                section_wise[sec_key]['present'] += 1

    cw_res = {}
    for k, v in class_wise.items():
        cw_res[k] = int(round((v['present'] / v['total']) * 100)) if v['total'] > 0 else 0
        
    sw_res = {}
    for k, v in section_wise.items():
        sw_res[k] = int(round((v['present'] / v['total']) * 100)) if v['total'] > 0 else 0

    return {
        "total": total_students,
        "present": present,
        "absent": absent,
        "leave": leave,
        "rate": rate,
        "class_wise": cw_res,
        "section_wise": sw_res,
        "high_risk_count": high_risk_count
    }

@app.get("/teacher-leaves", response_model=List[schemas.TeacherLeaveResponse])
def get_teacher_leaves(db: Session = Depends(get_db)):
    leaves = db.query(models.TeacherLeave).order_by(models.TeacherLeave.leave_date.desc()).all()
    res = []
    for leave in leaves:
        res.append({
            "id": leave.id,
            "teacher_id": leave.teacher_id,
            "leave_date": leave.leave_date,
            "leave_type": leave.leave_type,
            "reason": leave.reason,
            "teacher_name": leave.teacher.full_name if leave.teacher else "Unknown"
        })
    return res
