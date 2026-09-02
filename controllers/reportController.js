import db from "../db/db.js";

export const getAllReports = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         r.id,
         r.title,
         r.description,
         r.location,
         r.latitude,
         r.longitude,
         r.image,
         r.status,
         r.priority,
         r.admin_note,
         r.reported_date,
         r.assigned_date,
         c.name AS category,
         d.name AS department,
         reporter.name AS reported_by_name,
         r.reported_by,
         employee.name AS assigned_to_name,
         r.assigned_to
       FROM reports r
       LEFT JOIN categories c ON r.category_id = c.id
       LEFT JOIN departments d ON r.department_id = d.id
       LEFT JOIN users reporter ON r.reported_by = reporter.id
       LEFT JOIN users employee ON r.assigned_to = employee.id
       ORDER BY r.reported_date DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ message: "Failed to fetch reports" });
  }
};


export const getReportById = async (req, res) => {
  const { id } = req.params;

  try {
    const reportResult = await db.query(
      `SELECT
         r.*,
         c.name AS category,
         d.name AS department,
         reporter.name AS reported_by_name,
         employee.name AS assigned_to_name
       FROM reports r
       LEFT JOIN categories c ON r.category_id = c.id
       LEFT JOIN departments d ON r.department_id = d.id
       LEFT JOIN users reporter ON r.reported_by = reporter.id
       LEFT JOIN users employee ON r.assigned_to = employee.id
       WHERE r.id = $1`,
      [id]
    );

    if (reportResult.rows.length === 0) {
      return res.status(404).json({ message: "Report not found" });
    }

    const notesResult = await db.query(
      `SELECT n.id, n.message, n.created_at, u.name AS employee_name, d.name AS department
       FROM report_notes n
       LEFT JOIN users u ON n.employee_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE n.report_id = $1
       ORDER BY n.created_at ASC`,
      [id]
    );

    const imagesResult = await db.query(
      `SELECT id, image_path, uploaded_at
       FROM report_images
       WHERE report_id = $1
       ORDER BY uploaded_at ASC`,
      [id]
    );

    const historyResult = await db.query(
      `SELECT id, status, changed_at
       FROM status_history
       WHERE report_id = $1
       ORDER BY changed_at ASC`,
      [id]
    );

    const report = reportResult.rows[0];
    report.notes = notesResult.rows;
    report.progressImages = imagesResult.rows;
    report.history = historyResult.rows;

    res.json(report);
  } catch (error) {
    console.error("Error fetching report:", error);
    res.status(500).json({ message: "Failed to fetch report" });
  }
};


export const createReport = async (req, res) => {
  const {
    title,
    description,
    location,
    latitude,
    longitude,
    image,
    category_id,
    reported_by
  } = req.body;

  if (!title || !description || !location || !reported_by) {
    return res.status(400).json({
      message: "Title, description, location and reporter are required"
    });
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const reportResult = await client.query(
      `INSERT INTO reports
         (title, description, location, latitude, longitude, image, category_id, reported_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pending Review')
       RETURNING *`,
      [title, description, location, latitude, longitude, image, category_id, reported_by]
    );

    const newReport = reportResult.rows[0];

    await client.query(
      `INSERT INTO status_history (report_id, status, changed_by)
       VALUES ($1, 'Pending Review', $2)`,
      [newReport.id, reported_by]
    );

    await client.query("COMMIT");

    res.status(201).json(newReport);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating report:", error);
    res.status(500).json({ message: "Failed to create report" });
  } finally {
    client.release();
  }
};


export const assignReport = async (req, res) => {
  const { id } = req.params;
  const { department_id, assigned_to, priority, admin_note, changed_by } = req.body;

  if (!department_id || !assigned_to || !priority) {
    return res.status(400).json({
      message: "Department, employee and priority are required"
    });
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `UPDATE reports
       SET department_id = $1,
           assigned_to   = $2,
           priority      = $3,
           admin_note    = $4,
           status        = 'Assigned',
           assigned_date = NOW()
       WHERE id = $5
       RETURNING *`,
      [department_id, assigned_to, priority, admin_note, id]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Report not found" });
    }

    await client.query(
      `INSERT INTO status_history (report_id, status, changed_by)
       VALUES ($1, 'Assigned', $2)`,
      [id, changed_by]
    );

    await client.query("COMMIT");

    res.json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error assigning report:", error);
    res.status(500).json({ message: "Failed to assign report" });
  } finally {
    client.release();
  }
};



export const updateReportStatus = async (req, res) => {
  const { id } = req.params;
  const { status, changed_by } = req.body;

  const allowedStatuses = [
    "Assigned",
    "In Progress",
    "Under Review",
    "Resolved"
  ];

  if (!status || !allowedStatuses.includes(status)) {
    return res.status(400).json({
      message: "A valid status is required"
    });
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `UPDATE reports
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Report not found" });
    }

    await client.query(
      `INSERT INTO status_history (report_id, status, changed_by)
       VALUES ($1, $2, $3)`,
      [id, status, changed_by]
    );

    await client.query("COMMIT");

    res.json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating status:", error);
    res.status(500).json({ message: "Failed to update status" });
  } finally {
    client.release();
  }
};

export const rejectReport = async (req, res) => {
  const { id } = req.params;
  const { admin_note, changed_by } = req.body;

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `UPDATE reports
       SET status = 'Rejected',
           admin_note = $1
       WHERE id = $2
       RETURNING *`,
      [admin_note, id]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Report not found" });
    }

    await client.query(
      `INSERT INTO status_history (report_id, status, changed_by)
       VALUES ($1, 'Rejected', $2)`,
      [id, changed_by]
    );

    await client.query("COMMIT");

    res.json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error rejecting report:", error);
    res.status(500).json({ message: "Failed to reject report" });
  } finally {
    client.release();
  }
};


export const addNote = async (req, res) => {
  const { id } = req.params;
  const { message, employee_id } = req.body;

  if (!message || message.trim() === "") {
    return res.status(400).json({ message: "Note message is required" });
  }

  try {
    const reportCheck = await db.query(
      "SELECT id FROM reports WHERE id = $1",
      [id]
    );

    if (reportCheck.rows.length === 0) {
      return res.status(404).json({ message: "Report not found" });
    }

    const result = await db.query(
      `INSERT INTO report_notes (report_id, employee_id, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, employee_id, message.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding note:", error);
    res.status(500).json({ message: "Failed to add note" });
  }
};