const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.use(cors());
app.use(express.json());

const port = 80;

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME, // Use the database name you specified in RDS
  connectionLimit: 10, // Adjust based on your needs
});

// Initialize table and schema
const initializeTable = () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS student_details (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      age INT NOT NULL,
      gender VARCHAR(50) NOT NULL
    )
  `;

  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Error connecting to database:", err);
      return;
    }

    connection.query(createTableQuery, (err) => {
      connection.release(); // Release the connection back to the pool
      if (err) {
        console.error("Error creating table:", err);
        return;
      }
      console.log("Table created or already exists.");
    });
  });
};

// Initialize the table when the app starts
initializeTable();

// Routes
app.post("/add_user", (req, res) => {
  const { name, email, age, gender } = req.body;
  if (!name || !email || !age || !gender) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const sql =
    "INSERT INTO student_details (`name`,`email`,`age`,`gender`) VALUES (?, ?, ?, ?)";
  const values = [name, email, age, gender];

  pool.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error adding student:", err);
      return res.status(500).json({ message: "Something unexpected occurred" });
    }
    return res.json({ success: "Student added successfully" });
  });
});

app.get("/students", (req, res) => {
  const sql = "SELECT * FROM student_details";
  pool.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching students:", err);
      return res.status(500).json({ message: "Server error" });
    }
    return res.json(result);
  });
});

app.get("/get_student/:id", (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM student_details WHERE `id`= ?";
  pool.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Error fetching student:", err);
      return res.status(500).json({ message: "Server error" });
    }
    return res.json(result);
  });
});

app.post("/edit_user/:id", (req, res) => {
  const id = req.params.id;
  const { name, email, age, gender } = req.body;
  if (!name || !email || !age || !gender) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const sql =
    "UPDATE student_details SET `name`=?, `email`=?, `age`=?, `gender`=? WHERE id=?";
  const values = [name, email, age, gender, id];

  pool.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error updating student:", err);
      return res.status(500).json({ message: "Something unexpected occurred" });
    }
    return res.json({ success: "Student updated successfully" });
  });
});

app.delete("/delete/:id", (req, res) => {
  const id = req.params.id;
  const sql = "DELETE FROM student_details WHERE id=?";
  pool.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Error deleting student:", err);
      return res.status(500).json({ message: "Something unexpected occurred" });
    }
    return res.json({ success: "Student deleted successfully" });
  });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});