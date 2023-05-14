module.exports = {
    Name: "Main",
    Route: "/",
    Method: "GET",
    Log: null, // Set to 'File', 'Console', or 'Null'
    Sqlite: null,
    /**
     * Handle the request.
     * @param {import('express').Request} req - The request object.
     * @param {import('express').Response} res - The response object.
     * @param {import('sqlite3').Database} db - The database connection object.
     */
    async handle(req, res, db) {
        res.status(200).sendFile("200.html", { root: "public" });
    },
  };
  
