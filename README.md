# Work Log Pro

Build a simple, professional employee attendance and work-hours management web app.

IMPORTANT:

Keep the project simple and lightweight.

Build an MVP that is fully functional.

Do not add unnecessary features.

Use Hebrew RTL interface.

Mobile-first design because employees will mainly use their phones.

Default company name: "מכללת המשווקים".

The admin can change the company name and upload a company logo.

1. EMPLOYEE LOGIN

Employees do NOT create accounts themselves.

The admin creates employees with:

Full name

ID number (ת"ז)

Hourly wage

Active / inactive status

Employee login:

Employee enters their ID number and name.

The system checks that they match an active employee.

After successful login, show ONLY the employee attendance screen.

2. EMPLOYEE ATTENDANCE SCREEN

The employee sees:

Employee name

Current date

Current status:

לא התחלת עבודה

בעבודה

סיימת עבודה

Main actions:

כניסה

To report starting work:

Employee must scan a QR/barcode generated and uploaded by the admin.

The QR/barcode must be valid/current.

After successful scan, request the employee's location using browser geolocation.

Save:

Employee

Date

Time

Location coordinates

QR/barcode used

Entry/exit type

יציאה

To report finishing work:

Scan the current QR/barcode again.

Request location again.

Save exit time and location.

Calculate total work duration.

The employee must NOT be able to manually add or edit working hours.

3. QR/BARCODE SECURITY

The admin can generate/upload a new QR/barcode.

The admin should be able to change it every day or every few days.

A QR/barcode should have a unique value/token and validity period.

Example:

Admin creates QR for today.

Employee must physically scan the current QR.

Old QR becomes invalid when the admin changes it or when its validity expires.

Do NOT allow employees to upload a photo of a QR code or enter the QR value manually.

The goal is to make it difficult for an employee to report attendance from home.

4. EMPLOYEE MONTHLY SUMMARY

On the employee screen show a simple monthly summary:

Total approved days

Total approved hours

Current month

List of attendance records

Entry time

Exit time

Daily hours

Approval status

The employee should be able to hide/collapse the monthly summary.

IMPORTANT:
Only ADMIN-APPROVED work records count toward the employee's totals.

If a manager has NOT approved a specific day's hours, those hours must NOT be included in the totals.

5. ADMIN LOGIN

Create a separate admin login.

Admin credentials are configured by the system/project.

The admin dashboard should have these simple sections:

Dashboard

Show:

Total employees

Employees currently working

Total approved hours this month

Total approved payroll this month

Employees

Admin can:

Add employee

Edit employee

Deactivate employee

Change employee name

Change ID number

Change hourly wage

Add/edit travel reimbursement

Add/edit bonus

Employee data:

Name

ID number

Hourly wage

Travel

Bonus

Active/inactive

Attendance

Admin can see all employees' attendance records.

For each day:

Employee

Date

Entry

Exit

Total hours

Location

Approval status

Admin can:

Approve hours

Reject/unapprove hours

Edit hours

Add attendance manually

IMPORTANT:
ONLY ADMIN CAN ADD OR EDIT HOURS MANUALLY.
Employees cannot edit attendance.

QR / Barcode

Admin can:

Generate a new QR code

Set its validity

Activate/deactivate it

Replace the current QR code

Show the current active QR code clearly so the manager can display/print it at the workplace.

Payroll

Create a simple monthly payroll report.

For each employee calculate:

Approved hours × hourly wage

bonus

travel
= total gross payment

Show:

Employee

Approved days

Approved hours

Hourly wage

Base salary

Bonus

Travel

Total gross

Only APPROVED hours are included.

Allow selecting a month.

Add a simple "Export CSV" button for the payroll report.

6. COMPANY SETTINGS

Admin can change:

Company name

Company logo

Default:
Company name: "מכללת המשווקים"

Logo can be uploaded by the admin.

7. DATABASE

Use a clean database structure.

Suggested tables:

employees

attendance

qr_codes

company_settings

admin_users

Attendance should store:

employee_id

date

entry_time

exit_time

entry_latitude

entry_longitude

exit_latitude

exit_longitude

qr_code_id

status

approved_by

approved_at

Use proper security rules so employees can only access their own attendance data and cannot modify attendance records.

8. DESIGN

Very simple professional UI.

Hebrew RTL.

Mobile-first employee screen.

Use large buttons:
🟢 כניסה
🔴 יציאה

Admin dashboard can use cards and tables.

Do not over-design.

Do not add:

Chat

Notifications

Complex roles

Social features

Unnecessary animations

Payment gateway

External payroll integration

The priority is:

Employee login

QR scan

Location verification

Entry/exit

Admin approval

Monthly hours

Payroll calculation

Employee management

Company logo/name

Build the complete working MVP now, with clean reusable components and a simple database structure.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://team-clock-scan.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cde6c601-5ea2-4dc7-8eae-563dcadfe13c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
