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
    //Authorization
    app.post("/signup", (req, res) => {
        const username = req.body.username;
        const password = req.body.password;
      
        db.run(
          "INSERT INTO users (username, password) VALUES (?, ?)",
          [username, password],
          (err) => {
            if (err) {
              res.status(500).json({ message: "User already exists" });
            } else {
              res.cookie("username", username);
              res.cookie("password", password);
              res.status(200).json({ message: "User created" });
            }
          }
        );
      });
  },
};
