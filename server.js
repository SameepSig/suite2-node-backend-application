const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const path = require("path");
const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");

const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.use(cors());
app.use(express.json());

const port = 80;

// Initialize AWS SSM client
const ssmClient = new SSMClient({ region: "us-east-1" }); // Replace with your region

// Function to retrieve a parameter from SSM
const getParameter = async (name, decrypt = false) => {
  const command = new GetParameterCommand({
    Name: name,
    WithDecryption: decrypt, // Decrypt SecureString parameters
  });
  const response = await ssmClient.send(command);
  return response.Parameter.Value;
};

// Retrieve RDS credentials from SSM
const initializeDatabaseConfig = async () => {
  const dbConfig = {
    host: await getParameter("/myapp/rds/endpoint"),
    user: await getParameter("/myapp/rds/username"),
    password: await getParameter("/myapp/rds/password", true), // Decrypt the password
    database: await getParameter("/myapp/rds/database_name"),
  };
  return dbConfig;
};

// Function to create a table if it doesn't exist
const createTableIfNotExists = async (pool) => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS student_details (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  try {
    await pool.query(createTableQuery);
    console.log("Table 'student_details' created or already exists.");
  } catch (err) {
    console.error("Failed to create table:", err);
    throw err; // Re-throw the error to handle it in the calling function
  }
};

// Create a connection pool and initialize the database
let pool;
initializeDatabaseConfig()
  .then(async (dbConfig) => {
    pool = mysql.createPool(dbConfig);
    console.log("Database configuration loaded successfully.");

    // Create the table if it doesn't exist
    await createTableIfNotExists(pool);
  })
  .catch((err) => {
    console.error("Failed to load database configuration or create table:", err);
    process.exit(1); // Exit the application if configuration or table creation fails
  });

// Routes
app.post("/add_user", (req, res) => {
  const sql =
    "INSERT INTO student_details (`name`,`email`,`age`,`gender`) VALUES (?, ?, ?, ?)";
  const values = [req.body.name, req.body.email, req.body.age, req.body.gender];
  db.query(sql, values, (err, result) => {
    if (err)
      return res.json({ message: "Something unexpected has occurred: " + err });
    return res.json({ success: "Student added successfully" });
  });
});

app.get("/students", (req, res) => {
  const sql = "SELECT * FROM student_details";
  db.query(sql, (err, result) => {
    if (err) return res.json({ message: "Server error" });
    return res.json(result);
  });
});

app.get("/get_student/:id", (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM student_details WHERE `id`= ?";
  db.query(sql, [id], (err, result) => {
    if (err) return res.json({ message: "Server error" });
    return res.json(result);
  });
});

app.post("/edit_user/:id", (req, res) => {
  const id = req.params.id;
  const sql =
    "UPDATE student_details SET `name`=?, `email`=?, `age`=?, `gender`=? WHERE id=?";
  const values = [
    req.body.name,
    req.body.email,
    req.body.age,
    req.body.gender,
    id,
  ];
  db.query(sql, values, (err, result) => {
    if (err)
      return res.json({ message: "Something unexpected has occurred: " + err });
    return res.json({ success: "Student updated successfully" });
  });
});

app.delete("/delete/:id", (req, res) => {
  const id = req.params.id;
  const sql = "DELETE FROM student_details WHERE id=?";
  const values = [id];
  db.query(sql, values, (err, result) => {
    if (err)
      return res.json({ message: "Something unexpected has occurred: " + err });
    return res.json({ success: "Student deleted successfully" });
  });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});