module.exports = {
  Name: "Signup",
  Route: "/auth/signup",
  Method: "POST",
  Log: "File", // Set to 'File', 'Console', or 'Null'
  Sqlite: "users.sqlite",
  /**
   * Handle the request.
   * @param {import('express').Request} req - The request object.
   * @param {import('express').Response} res - The response object.
   * @param {import('sqlite3').Database} db - The database connection object.
   */
  async handle(req, res, db) {
    await db.run(
      "CREATE TABLE IF NOT EXISTS users (username TEXT, password TEXT)"
    );

    // Authorization
    const username = req.body.username;
    const password = req.body.password;

    // Check if the user already exists
    try {
      const userExists = await db.get(
        "SELECT * FROM users WHERE username = ?",
        [username]
      );
    } catch (err) {
      res.status(500).json({ message: "Failed to create user" });
    }

    if (userExists) {
      res.status(409).json({ message: "User already exists" });
    } else {
      await db.run(
        "INSERT INTO users (username, password) VALUES (?, ?)",
        [username, password],
        (err) => {
          if (err) {
            res.status(500).json({ message: "Failed to create user" });
          } else {
            res.cookie("username", username);
            res.cookie("password", password);
            res.status(200).json({ message: "User created" });
          }
        }
      );
    }
  },
};
