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

// Create a connection pool
let pool;
initializeDatabaseConfig()
  .then((dbConfig) => {
    pool = mysql.createPool(dbConfig);
    console.log("Database configuration loaded successfully.");
  })
  .catch((err) => {
    console.error("Failed to load database configuration:", err);
    process.exit(1); // Exit the application if configuration fails
  });

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

// Other routes...

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});