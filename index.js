const express = require("express");
const bodyParser = require("body-parser");
const db = require("./db");
const oracledb = require("oracledb");

const app = express();
const port = 5000;

app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("Welcome to the Room Booking API!");
});

// Test database connection
app.get("/test-connection", async (req, res) => {
  try {
    const result = await db.execute(
      "SELECT * FROM user1 FETCH FIRST 5 ROWS ONLY"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route to show available properties
app.post("/listings", async (req, res) => {
  const { start_date, end_date } = req.body;
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (!start_date || !end_date) {
    return res
      .status(400)
      .send({ error: "Start date and end date are required." });
  }

  let connection;
  try {
    connection = await oracledb.getConnection();

    const result = await connection.execute(
      `BEGIN 
         get_available_properties(:start_date, :end_date, :cursor); 
       END;`,
      {
        start_date: start_date,
        end_date: end_date,
        cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const resultSet = result.outBinds.cursor;
    const rows = await resultSet.getRows(0); // Changed from getRows() to getRows(0)
    await resultSet.close();

    res.status(200).json({
      success: true,
      data: rows || [],
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({
      error: "Internal Server Error",
      details: err.message,
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error("Error closing connection:", err);
      }
    }
  }
});

// Add this route to your index.js
app.post("/book-property", async (req, res) => {
  const { guest_id, property_id, start_date, end_date } = req.body;

  // Validate input
  if (!guest_id || !property_id || !start_date || !end_date) {
    return res.status(400).json({
      success: false,
      error: "Missing required booking parameters",
    });
  }

  try {
    // Execute the booking procedure
    await db.execute(
      `BEGIN 
         Book_Property(
           :guest_id, 
           :property_id, 
           :start_date, 
           :end_date
         ); 
       END;`,
      {
        guest_id: guest_id,
        property_id: property_id,
        start_date: start_date,
        end_date: end_date,
      }
    );

    // If no error was raised, booking was successful
    res.status(201).json({
      success: true,
      message: "Property booked successfully",
    });
  } catch (err) {
    // Handle specific Oracle error codes
    if (err.errorNum) {
      switch (err.errorNum) {
        case 20001:
          return res.status(409).json({
            success: false,
            error: "The property is already booked for the specified dates",
          });
        case 20002:
          return res.status(400).json({
            success: false,
            error: "Start date must be before end date",
          });
        case 20003:
          return res.status(404).json({
            success: false,
            error: "Property does not exist",
          });
        default:
          console.error("Booking error:", err);
          return res.status(500).json({
            success: false,
            error: "An unexpected error occurred during booking",
            details: err.message,
          });
      }
    }

    // Generic error handling
    console.error("Booking error:", err);
    res.status(500).json({
      success: false,
      error: "An unexpected error occurred",
      details: err.message,
    });
  }
});

app.post("/list-property", async (req, res) => {
  const {
    host_id,
    address,
    city,
    state,
    country,
    description,
    property_type,
    prop_name,
    price_nightly,
  } = req.body;

  if (
    !host_id ||
    !address ||
    !city ||
    !state ||
    !country ||
    !description ||
    !property_type ||
    !prop_name ||
    !price_nightly
  ) {
    return res.status(400).json({
      success: false,
      error: "Missing required property listing parameters",
    });
  }

  try {
    const result = await db.execute(
      `BEGIN 
         List_Property(
           :host_id, 
           :address, 
           :city, 
           :state, 
           :country, 
           :description, 
           :property_type, 
           :prop_name, 
           :price_nightly
         ); 
       END;`,
      {
        host_id,
        address,
        city,
        state,
        country,
        description,
        property_type,
        prop_name,
        price_nightly,
      }
    );

    return res.status(201).json({
      success: true,
      message: "Property listed successfully",
      result,
    });
  } catch (err) {
    if (err.errorNum) {
      switch (err.errorNum) {
        case 20101:
          return res.status(400).json({
            success: false,
            error: "Missing required property details",
          });
        case 20102:
          return res.status(409).json({
            success: false,
            error: "A property with similar details already exists",
          });
        default:
          console.error("Property listing error:", err);
          return res.status(500).json({
            success: false,
            error: "An unexpected error occurred during property listing",
            details: err.message,
          });
      }
    }

    console.error("Property listing error:", err);
    return res.status(500).json({
      success: false,
      error: "An unexpected error occurred",
      details: err.message,
    });
  }
});

// login endpoint
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: "Email and password are required",
    });
  }

  try {
    // Execute the login procedure
    const result = await db.execute(
      `BEGIN 
         Login_User(:email, :password); 
       END;`,
      { email, password }
    );

    // If we reach here without an error, the login was successful
    return res.status(200).json({
      success: true,
      message: "Login successful",
    });
  } catch (err) {
    // Handle specific Oracle error codes
    if (err.errorNum) {
      switch (err.errorNum) {
        case 20301:
          return res.status(404).json({
            success: false,
            error: "Email not found",
          });
        case 20302:
          return res.status(401).json({
            success: false,
            error: "Invalid password",
          });
        case 20300:
          // Successful case - extract user ID and role from error message
          const [, user_id, role] = err.message.split(":");
          return res.status(200).json({
            success: true,
            message: "Login successful",
            userId: parseInt(user_id),
            role: role,
          });
        default:
          console.error("Login error:", err);
          return res.status(500).json({
            success: false,
            error: "An unexpected error occurred during login",
            details: err.message,
          });
      }
    }

    // Generic error handling
    console.error("Login error:", err);
    res.status(500).json({
      success: false,
      error: "An unexpected error occurred",
      details: err.message,
    });
  }
});

app.post("/add-user", async (req, res) => {
  const { user_name, email, password, role, birthdate, gender, phone } =
    req.body;

  // Validate input
  if (
    !user_name ||
    !email ||
    !password ||
    !role ||
    !birthdate ||
    !gender ||
    !phone
  ) {
    return res.status(400).json({
      success: false,
      error: "Missing required user parameters",
    });
  }

  try {
    // Execute the Add_User procedure
    await db.execute(
      `
        BEGIN 
          Add_User(
            :user_name,
            :email,
            :password,
            :role,
            TO_DATE(:birthdate, 'YYYY-MM-DD'),
            :gender,
            :phone
          ); 
        END;
      `,
      {
        user_name,
        email,
        password,
        role,
        birthdate,
        gender,
        phone,
      }
    );

    // If no error was raised, user was successfully added
    res.status(201).json({
      success: true,
      message: "User added successfully",
    });
  } catch (err) {
    // Handle specific Oracle error codes
    if (err.errorNum) {
      switch (err.errorNum) {
        case 20001:
          return res.status(409).json({
            success: false,
            error: "Email already exists",
          });
        case 20002:
          return res.status(409).json({
            success: false,
            error: "Phone number already exists",
          });
        case 20003:
          return res.status(500).json({
            success: false,
            error: "An unexpected error occurred during user creation",
            details: err.message,
          });
        default:
          console.error("Add user error:", err);
          return res.status(500).json({
            success: false,
            error: "An unexpected error occurred",
            details: err.message,
          });
      }
    }

    // Generic error handling
    console.error("Add user error:", err);
    res.status(500).json({
      success: false,
      error: "An unexpected error occurred",
      details: err.message,
    });
  }
});

// Start server
app.listen(port, async () => {
  console.log(`Server running on http://localhost:${port}`);
  try {
    await db.initialize();
  } catch (err) {
    console.error("Error initializing database:", err);
    process.exit(1);
  }
});

// Clean up on exit
process.on("SIGINT", async () => {
  await db.close();
  process.exit(0);
});
