require("dotenv").config();
const oracledb = require("oracledb");

// Configure oracledb
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = true;

async function initialize() {
  try {
    await oracledb.createPool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECTION_STRING,
      poolMin: 2,
      poolMax: 5,
      poolIncrement: 1,
    });
    console.log("Database pool created");
  } catch (err) {
    console.error("Error creating database pool:", err);
    process.exit(1);
  }
}

async function close() {
  try {
    await oracledb.getPool().close(0);
    console.log("Database pool closed");
  } catch (err) {
    console.error("Error closing database pool:", err);
  }
}

async function execute(sql, binds = [], options = {}) {
  let connection;
  try {
    connection = await oracledb.getConnection();
    const result = await connection.execute(sql, binds, {
      ...options,
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });
    return result;
  } catch (err) {
    console.error("Error executing SQL:", err);
    throw err;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error("Error closing connection:", err);
      }
    }
  }
}

module.exports = { initialize, close, execute };
