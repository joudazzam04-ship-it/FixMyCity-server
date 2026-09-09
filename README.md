# FixMyCity — Backend

## My Application

FixMyCity is a civic issue reporting system that allows citizens to report public problems to their municipality and follow the progress of those reports.

This repository contains the REST API: an Express server backed by a PostgreSQL database. It handles authentication, report management, user management and role-based access control. The React frontend that consumes this API lives in [FixMyCity-client](https://github.com/joudazzam04-ship-it/FixMyCity-client).

The API supports three roles. Citizens create reports and view their own. Employees update the reports assigned to them. Administrators assign reports to employees and manage user accounts.

A report moves through six states — Pending Review, Assigned, In Progress, Under Review, Resolved and Rejected — and every transition is written to a status history table with a timestamp, so the full lifecycle of a report can be reconstructed.

## Technologies

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime |
| Express | Web framework and routing |
| PostgreSQL | Relational database |
| node-postgres (`pg`) | PostgreSQL client, using a connection pool |
| CORS | Allows requests from the frontend origin |
| dotenv | Loads environment variables from a `.env` file |

The project uses ES modules throughout. Images are stored as base64 strings in text columns, which keeps every endpoint to plain JSON with no file upload middleware. Because base64 encoding inflates file size by roughly a third, the JSON body limit is raised to 10 MB in `server.js`.

## Getting Started

### Prerequisites

- Node.js version 18 or later
- PostgreSQL version 14 or later

### Installation

Clone the repository and move into it:

```bash
git clone https://github.com/joudazzam04-ship-it/FixMyCity-server.git
cd FixMyCity-server
```

Install the dependencies:

```bash
npm install
```

### Database Setup

Create the database:

```sql
CREATE DATABASE "FixMyCity";
```

Then run the included schema file to create the tables and insert the seed data — the departments, the report categories and an administrator account:

```bash
psql -U postgres -d FixMyCity -f schema.sql
```

### Environment Variables

Create a `.env` file in the project root:
```
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/FixMyCity

```

### Running the Server

```bash
npm start
```

The server runs at `http://localhost:5000`.

To confirm everything is working, open `http://localhost:5000` in a browser — it should return a JSON message saying the API is running. Then open `http://localhost:5000/api/test-db`, which returns the current database time and confirms the connection.

## Project Structure
```
FixMyCity-server/
├── controllers/ Request handlers containing the SQL queries
│ ├── lookupController.js
│ ├── reportController.js
│ └── userController.js
├── db/
│ └── db.js PostgreSQL connection pool
├── middleware/
│ └── roleAuth.js Role-based access control
├── routes/ Route definitions, one file per resource
│ ├── authRoutes.js
│ ├── lookupRoutes.js
│ ├── reportRoutes.js
│ └── userRoutes.js
├── .env Environment variables (not committed)
├── schema.sql Database schema and seed data
├── package.json
└── server.js Application entry point
```

`server.js` sets up the middleware, mounts the four routers under `/api`, and starts the server. Each route file defines the endpoints for one resource and delegates the work to a controller. The controllers hold the SQL queries and send the responses.

## Database Schema

The database contains seven tables.

| Table | Purpose |
|---|---|
| `users` | All accounts, with a `role` column of `citizen`, `employee` or `admin` |
| `departments` | Municipality departments an employee can belong to |
| `categories` | The categories a citizen can choose when reporting an issue |
| `reports` | The reports themselves, linked to a reporter, a category, and optionally a department and assignee |
| `report_notes` | Progress notes written by employees |
| `report_images` | Progress photos uploaded by employees |
| `status_history` | One row per status change, giving each report a full audit trail |

Operations that must not partially succeed — creating a report, assigning one, changing a status — are wrapped in database transactions, so the report row and its status history row are always written together or not at all.

## Authentication

Authentication is deliberately simplified for this project. On login the server verifies the email and password and returns the user object, which the frontend stores in `localStorage`.

Protected endpoints are guarded by the `requireRole` middleware. It reads an `x-role` header from the request and checks it against the roles permitted for that route:

```javascript
router.post("/", requireRole("citizen"), createReport);
```

Requests with no header receive `401 Unauthorized`; requests with a role that is not permitted receive `403 Forbidden`.

Two limitations are worth stating explicitly. Passwords are stored in plain text rather than hashed, and the `x-role` header proves only what role the client claims to have, not who they are. Both would be solved by hashing passwords with bcrypt and replacing the header with a signed JSON Web Token, which are documented as future improvements.

## API Endpoints

All endpoints are prefixed with `/api`.

### Authentication

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/auth/signup` | Public | Register a citizen account. Body: `name`, `email`, `password`, `phone` |
| POST | `/auth/login` | Public | Log in. Body: `email`, `password`. Returns the user object |

The signup endpoint always creates a citizen; the role cannot be set by the client. Login rejects accounts whose status is `Inactive`.

### Reports

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/reports` | Public | List all reports, with reporter, assignee, category and department names joined in |
| GET | `/reports/:id` | Public | One report with its notes, progress images and status history |
| POST | `/reports` | Citizen | Create a report. Body: `title`, `description`, `location`, `latitude`, `longitude`, `image`, `category_id`, `reported_by` |
| PUT | `/reports/:id/assign` | Admin | Assign to a department and employee. Body: `department_id`, `assigned_to`, `priority`, `admin_note`, `changed_by` |
| PUT | `/reports/:id/reject` | Admin | Reject a report. Body: `admin_note`, `changed_by` |
| PUT | `/reports/:id/status` | Employee | Change the status. Body: `status`, `changed_by` |
| POST | `/reports/:id/notes` | Employee | Add a progress note. Body: `message`, `employee_id` |
| POST | `/reports/:id/images` | Employee | Add a progress image. Body: `image` (base64 string) |
| DELETE | `/reports/:id` | Citizen | Delete an own report that is still pending. Body: `user_id` |

The status endpoint accepts only `Assigned`, `In Progress`, `Under Review` and `Resolved`. The delete endpoint allows a citizen to remove only their own report, and only while its status is still `Pending Review`.

### Users

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/users` | Admin | List all users with their department |
| GET | `/users/employees/department/:departmentId` | Admin | List active employees in one department |
| GET | `/users/:id` | Any role | Get one user's profile |
| POST | `/users/employees` | Admin | Create an employee account. Body: `name`, `email`, `password`, `phone`, `department_id` |
| PUT | `/users/:id/status` | Admin | Activate or deactivate an account. Body: `status` |
| PUT | `/users/:id/profile` | Any role | Update name and phone. Body: `name`, `phone` |

### Lookups

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/categories` | Public | List report categories |
| GET | `/departments` | Public | List municipality departments |

### Access Control

Endpoints marked with a role require an `x-role` header matching one of the permitted roles:
```
x-role: admin
```

### Example Request

Creating a report:
```
POST http://localhost:5000/api/reports
Content-Type: application/json
x-role: citizen

{
"title": "Large pothole on Arar Street",
"description": "A deep pothole in the right lane near the junction.",
"location": "Arar Street, Amman",
"latitude": 31.95503,
"longitude": 35.92438,
"image": "data:image/jpeg;base64,...",
"category_id": 1,
"reported_by": 2
}
```

The response is the created report row, with `status` set to `Pending Review` and a matching row written to `status_history`.

### Error Responses

Errors return a JSON object with a `message` field:

```json
{ "message": "Invalid credentials" }
```

| Status | Meaning |
|---|---|
| 400 | Missing or invalid data in the request |
| 401 | Not authenticated |
| 403 | Authenticated but not permitted to perform this action |
| 404 | Resource not found |
| 413 | Request body too large, usually an oversized image |
| 500 | Server or database error |

## Future Improvements

- Hash passwords with bcrypt instead of storing them in plain text
- Replace the `x-role` header with a signed JSON Web Token so the server verifies identity rather than trusting a claimed role
- Store uploaded images on disk or in object storage and keep only the file path in the database
- Filter reports server-side by assignee and reporter, rather than returning all reports and filtering in the client