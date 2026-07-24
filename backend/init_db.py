"""
init_db.py — Namma Chhatra Database Seeder
Clears all rows (no schema changes) and populates with realistic Indian sample data.
Includes today's attendance and auto-generated high-risk notifications.
"""

from database import engine, SessionLocal
import models
from auth import get_password_hash
import random
from datetime import datetime, timedelta, date, time

INDIAN_FIRST_MALE = [
    "Aarav","Arjun","Rohan","Kiran","Vikram","Suresh","Ravi","Mohit",
    "Aditya","Sanjay","Rajesh","Deepak","Anand","Manoj","Nitin",
    "Gaurav","Pranav","Varun","Akash","Harish","Pradeep","Naveen",
    "Vivek","Pavan","Sachin","Yash","Dinesh","Lokesh","Rahul","Amit",
    "Ajay","Vijay","Suraj","Tarun","Nikhil","Rishabh","Harsh","Dev",
    "Kabir","Sahil","Arun","Vishal","Chirag","Kartik","Tushar",
]
INDIAN_FIRST_FEMALE = [
    "Ananya","Priya","Sneha","Pooja","Kavya","Meena","Rekha","Sunita",
    "Divya","Nisha","Asha","Radha","Lakshmi","Gayatri","Swati",
    "Pallavi","Shreya","Neha","Aishwarya","Preeti","Manjula","Shalini",
    "Archana","Vandana","Hema","Usha","Kavitha","Sandhya","Yamini",
    "Deepa","Vani","Jyothi","Rani","Saritha","Sudha","Bharathi",
    "Geetha","Latha","Nirmala","Padma","Revathi","Savitha","Triveni",
]
INDIAN_LAST = [
    "Sharma","Verma","Kumar","Singh","Patel","Reddy","Nair","Rao",
    "Gupta","Joshi","Mehta","Iyer","Pillai","Shetty","Yadav",
    "Tiwari","Mishra","Dubey","Pandey","Chaudhary","Kaur","Malhotra",
    "Aggarwal","Bhatia","Chopra","Kapoor","Saxena","Srivastava",
    "Bhatt","Kulkarni","Desai","Shah","Jain","Naidu","Gowda",
    "Hegde","Bhat","Nayak","Menon","Krishnan","Venkat","Subramaniam",
]
CITIES = ["Bangalore","Mumbai","Delhi","Chennai","Hyderabad","Pune",
          "Mysore","Mangalore","Hubli","Belgaum","Davangere","Shimoga"]
STREETS = ["MG Road","Gandhi Nagar","JP Nagar","Rajajinagar","Koramangala",
           "Indiranagar","Basavanagudi","Malleswaram","Whitefield","Yelahanka"]

ATTENDANCE_BUCKETS = [
    (0.95, "Excellent"),
    (0.88, "Good"),
    (0.76, "Average"),
    (0.61, "Below Average"),
    (0.43, "Poor"),
]
RISK_REASONS = {
    "High": [
        "Chronic absenteeism (>50% absent days)",
        "Frequent unauthorised absences",
        "Extended consecutive absent streak",
        "Multiple months of irregular attendance",
    ],
    "Medium": [
        "Irregular attendance pattern",
        "Attendance declining over past month",
        "Frequent late arrivals",
        "Below-average attendance rate",
    ],
    "Low": [
        "Occasional absences, otherwise consistent",
        "Slightly below expected attendance",
        "Few late arrivals recorded",
    ],
    "Safe": [
        "Consistent attendance record",
        "No significant absenteeism",
        "Regular and punctual",
    ],
}

def rand_name(gender):
    pool = INDIAN_FIRST_MALE if gender == "Male" else INDIAN_FIRST_FEMALE
    return f"{random.choice(pool)} {random.choice(INDIAN_LAST)}"

def rand_phone():
    return f"+91 {random.randint(70,99)}{random.randint(10000000,99999999)}"

def rand_address():
    return f"#{random.randint(1,200)}, {random.choice(STREETS)}, {random.choice(CITIES)} - {random.randint(560001,590099)}"

def rand_dob():
    today = date.today()
    start = today - timedelta(days=16*365)
    end   = today - timedelta(days=10*365)
    return start + timedelta(days=random.randint(0, (end-start).days))

def get_school_days(n: int) -> list:
    """Return last n school days (Mon–Sat), oldest first, including today."""
    days = []
    d = date.today()        # START FROM TODAY so today's attendance is seeded
    while len(days) < n:
        if d.weekday() != 6:
            days.append(d)
        d -= timedelta(days=1)
    days.reverse()
    return days

# Keep this name for backward compat (called in main.py via seed_if_empty)
def last_n_school_days(n: int) -> list:
    return get_school_days(n)


def clear_all_data(db):
    print("  Clearing existing data...")
    db.query(models.Notification).delete()
    db.query(models.DropoutPrediction).delete()
    db.query(models.Attendance).delete()
    db.query(models.TeacherSectionAssignment).delete()
    db.query(models.Student).delete()
    db.query(models.Teacher).delete()
    db.query(models.Headmaster).delete()
    db.query(models.User).delete()
    db.query(models.Section).delete()
    db.query(models.ClassModel).delete()
    db.commit()
    print("  [OK] All data cleared.")


def seed_data(db):
    # 1. Classes
    print("  Seeding classes...")
    class_names = ["Class 6","Class 7","Class 8","Class 9","Class 10"]
    db_classes = []
    for name in class_names:
        cls = models.ClassModel(class_name=name)
        db.add(cls); db_classes.append(cls)
    db.commit()
    for c in db_classes: db.refresh(c)

    # 2. Sections
    print("  Seeding sections...")
    section_names = ["A","B","C"]
    db_sections = []
    sections_by_class = {}
    sec_lookup = {}
    for cls in db_classes:
        sections_by_class[cls.id] = []
        for sname in section_names:
            sec = models.Section(class_id=cls.id, section_name=sname)
            db.add(sec); db_sections.append(sec)
            sections_by_class[cls.id].append(sec)
    db.commit()
    for sec in db_sections:
        db.refresh(sec)
        sec_lookup[(sec.class_id, sec.section_name)] = sec

    # 3. Headmaster
    print("  Seeding headmaster...")
    hm_user = models.User(full_name="Rajesh Kumar", email="headmaster@nammachhatra.com",
                          password_hash=get_password_hash("password123"), role="HEADMASTER")
    db.add(hm_user); db.commit(); db.refresh(hm_user)
    db.add(models.Headmaster(user_id=hm_user.id)); db.commit()

    # 4. Teachers
    print("  Seeding teachers...")
    teacher_specs = [
        ("Anita Sharma",  "anita.sharma",  "EMP1001", "+91 9876543210", "Class 10", "A"),
        ("Rahul Verma",   "rahul.verma",   "EMP1002", "+91 9876543211", "Class 10", "B"),
        ("Priya Nair",    "priya.nair",    "EMP1003", "+91 9876543212", "Class 9",  "A"),
        ("Arun Kumar",    "arun.kumar",    "EMP1004", "+91 9876543213", "Class 9",  "B"),
        ("Meena Patel",   "meena.patel",   "EMP1005", "+91 9876543214", "Class 8",  "A"),
        ("Karthik Rao",   "karthik.rao",   "EMP1006", "+91 9876543215", "Class 8",  "B"),
        ("Sneha Singh",   "sneha.singh",   "EMP1007", "+91 9876543216", "Class 7",  "A"),
        ("Suresh Reddy",  "suresh.reddy",  "EMP1008", "+91 9876543217", "Class 6",  "A"),
    ]
    db_teachers = []
    for (name, ep, emp_id, phone, cls_name, sec_name) in teacher_specs:
        t_user = models.User(full_name=name, email=f"{ep}@nammachhatra.com",
                             password_hash=get_password_hash("password123"), role="TEACHER")
        db.add(t_user); db.commit(); db.refresh(t_user)
        teacher = models.Teacher(user_id=t_user.id, employee_id=emp_id, phone=phone)
        db.add(teacher); db.commit(); db.refresh(teacher)
        target_cls = next(c for c in db_classes if c.class_name == cls_name)
        target_sec = sec_lookup[(target_cls.id, sec_name)]
        db.add(models.TeacherSectionAssignment(teacher_id=teacher.id, section_id=target_sec.id))
        db.commit()
        db_teachers.append((teacher, t_user, cls_name, sec_name))

    # 5. Students (11 per section = 165 total)
    print("  Seeding students...")
    students_per_section = 11
    db_students = []
    roll_counter = 1
    used_rolls = set()
    for cls in db_classes:
        cls_short = cls.class_name.split()[-1]
        for sec in sections_by_class[cls.id]:
            for _ in range(students_per_section):
                gender = random.choice(["Male","Female"])
                name   = rand_name(gender)
                roll   = f"STU{cls_short}{sec.section_name}{roll_counter:04d}"
                while roll in used_rolls:
                    roll_counter += 1
                    roll = f"STU{cls_short}{sec.section_name}{roll_counter:04d}"
                used_rolls.add(roll)
                admission = f"ADM{roll_counter:05d}"
                student = models.Student(
                    roll_number=roll, student_name=name, gender=gender,
                    dob=rand_dob(), class_id=cls.id, section_id=sec.id,
                    parent_name=rand_name(random.choice(["Male","Female"])),
                    parent_phone=rand_phone(), address=rand_address(),
                    admission_number=admission,
                    joining_date=date(2024, 6, random.randint(1,15)),
                )
                db.add(student); db_students.append(student)
                roll_counter += 1
    db.commit()
    for s in db_students: db.refresh(s)
    print(f"  [OK] {len(db_students)} students created.")

    # 6. Attendance (30 school days INCLUDING today)
    print("  Seeding attendance...")
    school_days = get_school_days(30)
    for idx, student in enumerate(db_students):
        bucket_rate, _ = ATTENDANCE_BUCKETS[idx % len(ATTENDANCE_BUCKETS)]
        for att_date in school_days:
            roll = random.random()
            if roll < bucket_rate * 0.85:
                status = "Present"
            elif roll < bucket_rate * 0.92:
                status = "Late"
            elif roll < bucket_rate:
                status = "Leave"
            else:
                status = "Absent"
            check_in = None
            if status == "Present":
                check_in = time(hour=8, minute=random.randint(0,20))
            elif status == "Late":
                check_in = time(hour=9, minute=random.randint(0,59))
            db.add(models.Attendance(student_id=student.id, attendance_date=att_date,
                                     check_in_time=check_in, status=status))
    db.commit()
    print("  [OK] Attendance records created (including today).")

    # 7. Predictions
    print("  Seeding dropout predictions...")
    for idx, student in enumerate(db_students):
        bucket_rate, _ = ATTENDANCE_BUCKETS[idx % len(ATTENDANCE_BUCKETS)]
        if bucket_rate >= 0.90:
            risk_level = "Safe";   risk_score = round(random.uniform(1,14),1)
        elif bucket_rate >= 0.75:
            risk_level = "Low";    risk_score = round(random.uniform(15,39),1)
        elif bucket_rate >= 0.55:
            risk_level = "Medium"; risk_score = round(random.uniform(40,69),1)
        else:
            risk_level = "High";   risk_score = round(random.uniform(70,99),1)
        db.add(models.DropoutPrediction(
            student_id=student.id, risk_score=risk_score, risk_level=risk_level,
            reason=random.choice(RISK_REASONS[risk_level])))
    db.commit()
    print("  [OK] Dropout predictions created.")

    # 8. Notifications — high-risk alerts for teachers and headmaster
    print("  Seeding notifications...")
    all_preds = db.query(models.DropoutPrediction).all()
    high_risk_preds = sorted([p for p in all_preds if p.risk_level == "High"],
                              key=lambda x: x.risk_score, reverse=True)
    teacher_notif_count = {}
    hm_notif_count = 0

    for pred in high_risk_preds:
        student = db.query(models.Student).filter(models.Student.id == pred.student_id).first()
        if not student:
            continue
        # Notify teacher
        assignment = db.query(models.TeacherSectionAssignment).filter(
            models.TeacherSectionAssignment.section_id == student.section_id).first()
        if assignment:
            tid = assignment.teacher_id
            if teacher_notif_count.get(tid, 0) < 5:
                teacher = db.query(models.Teacher).filter(models.Teacher.id == tid).first()
                if teacher:
                    db.add(models.Notification(
                        title="High Risk Student Alert",
                        message=f"{student.student_name} has been flagged High Risk "
                                f"(Score: {pred.risk_score}%). Reason: {pred.reason}",
                        user_id=teacher.user_id, is_read=False))
                    teacher_notif_count[tid] = teacher_notif_count.get(tid, 0) + 1
        # Notify headmaster (max 10)
        if hm_notif_count < 10:
            db.add(models.Notification(
                title="High Risk Alert",
                message=f"{student.student_name} — Risk Score: {pred.risk_score}%. {pred.reason}",
                user_id=hm_user.id, is_read=False))
            hm_notif_count += 1
    db.commit()
    print(f"  [OK] Notifications created.")


def init_db():
    """Full clear + reseed. Run manually: python init_db.py"""
    db = SessionLocal()
    try:
        print("=== Starting DB seed (data-only, schema preserved) ===")
        clear_all_data(db)
        seed_data(db)
        print("=== [OK] Database seeded successfully ===")
        _print_credentials()
    except Exception as e:
        import traceback; traceback.print_exc()
        db.rollback()
    finally:
        db.close()


def seed_if_empty():
    """Called at server startup — seeds only when no classes exist."""
    db = SessionLocal()
    try:
        count = db.query(models.ClassModel).count()
        if count == 0:
            print("[startup] Database is empty — running initial seed...")
            seed_data(db)
            print("[startup] [OK] Seeded.")
        else:
            print(f"[startup] Database has {count} classes — skipping seed.")
    except Exception as e:
        print(f"[startup] Seed error: {e}")
        db.rollback()
    finally:
        db.close()


def _print_credentials():
    print("\n" + "="*55)
    print("  SAMPLE LOGIN CREDENTIALS")
    print("="*55)
    accounts = [
        ("Headmaster", "headmaster@nammachhatra.com"),
        ("Teacher",    "anita.sharma@nammachhatra.com"),
        ("Teacher",    "rahul.verma@nammachhatra.com"),
        ("Teacher",    "priya.nair@nammachhatra.com"),
        ("Teacher",    "arun.kumar@nammachhatra.com"),
        ("Teacher",    "meena.patel@nammachhatra.com"),
        ("Teacher",    "karthik.rao@nammachhatra.com"),
        ("Teacher",    "sneha.singh@nammachhatra.com"),
        ("Teacher",    "suresh.reddy@nammachhatra.com"),
    ]
    for role, email in accounts:
        print(f"  {role:<12} {email:<40} password123")
    print("="*55 + "\n")


if __name__ == "__main__":
    init_db()
