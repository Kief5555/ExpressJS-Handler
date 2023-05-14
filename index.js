/******************************************************
 * Author:    Kief5555
 * Version:   1.0.0
 * License:   MIT
 ******************************************************/

console.clear();
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const winston = require("winston");
const chalk = require("chalk");
const bodyParser = require("body-parser");
const Table = require("cli-table3");
const sqlite3 = require("sqlite3").verbose();

const createDatabaseConnection = (dbFile) => {
  const db = new sqlite3.Database(path.join(__dirname, "database", dbFile));
  return db;
};

const app = express();
const port = 3000;

// Configure Winston logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: "YYYY-MM-DD hh:mm:ss A" }),
    winston.format.printf(({ timestamp, level, message, meta }) => {
      const formattedTimestamp = chalk.cyanBright(`[${timestamp}]`).padEnd(25);
      const formattedLevel =
        level === "info" ? chalk.green(level) : chalk.red(level);
      const formattedMeta = meta ? chalk.gray(`[${meta}]`) : "";
      return `${formattedTimestamp} [${formattedLevel}] ${formattedMeta} ${message}`;
    })
  ),
  defaultMeta: { service: "api-server" },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/favicon.ico', express.static('public/favicon.ico'));

const loadRoutesFromDirectory = (directoryPath, table, routePrefix = "") => {
  const routeFiles = fs.readdirSync(directoryPath, { withFileTypes: true });
  routeFiles.forEach((dirent) => {
    const file = dirent.name; // Extract the file name from the Dirent object
    const routePath = path.join(directoryPath, file);
    const routeStats = fs.statSync(routePath);

    if (routeStats.isDirectory()) {
      const subdirectoryPath = path.join(routePrefix.toString(), file);
      loadRoutesFromDirectory(routePath, table, subdirectoryPath);
    } else if (routeStats.isFile()) {
      const routeModule = require(routePath);

      if (
        routeModule.Name &&
        routeModule.Route &&
        routeModule.Method &&
        routeModule.handle
      ) {
        const { Name, Route, Method, handle } = routeModule;

        // Apply custom middlewares to each route
        if (routeModule.Log) {
          if (routeModule.Log === "File") {
            app.use(`${Route}`, (req, res, next) => {
              const method = req.method;
              const url = req.originalUrl;
              const start = new Date();
              res.on("finish", () => {
                const end = new Date();
                const status = res.statusCode;
                const responseTime = end - start;
                const formattedDate = chalk.blueBright(
                  `${start.toLocaleDateString()} | ${start.toLocaleTimeString()}`
                );
                const formattedMethod = chalk.yellow(method);
                const formattedUrl = chalk.white(url);
                const formattedStatus =
                  status >= 400 ? chalk.red(status) : chalk.green(status);
                const formattedResponseTime = chalk.white(`${responseTime}ms`);
                const logMessage = `${formattedDate} - ${formattedMethod} ${formattedUrl} ${formattedStatus} ${formattedResponseTime}`;
                logger.info(`${method} ${url} ${status} ${responseTime}ms`);
              });
              next();
            });
          } else if (routeModule.Log === "Console") {
            app.use(`${Route}`, (req, res, next) => {
              const method = req.method;
              const url = req.originalUrl;
              const start = new Date();
              res.on("finish", () => {
                const end = new Date();
                const status = res.statusCode;
                const responseTime = end - start;
                logger.info(`${method} ${url} ${status} ${responseTime}ms`);
              });
              next();
            });
          }
        }

        const dbFile = routeModule.Sqlite;
        const db = dbFile ? createDatabaseConnection(dbFile) : null;

        if (db) {
          routeModule.db = db; // Assign the db object to the route module
        }

        app[Method.toLowerCase()](`${Route}`, async (req, res, next) => {
          try {
            const result = await handle.bind(routeModule)(req, res, db);
            if (result) {
              res.send(result);
            }
          } catch (error) {
            next(error);
          }
        });
        table.push([Name, Method, `${Route}`, chalk.green("✓")]);
      } else {
        logger.error(`Invalid route module: ${file}`);
        table.push([file, "", "", chalk.red("✗")]);
      }
    }
  });
};

// Dynamically load routes from the directory
const routesDirectoryPath = path.join(__dirname, "routes");

const table = new Table({
  head: ["Name", "Method", "Route", "Status"],
  colAligns: ["left", "center", "center", "center"],
  style: { head: ["cyan"] },
});

loadRoutesFromDirectory(routesDirectoryPath, table, logger);

logger.info("Routes Loaded");
if (table.length > 0) {
  console.log(table.toString());
} else {
  logger.info("No routes loaded.");
}

// 404 handler
app.use(function (req, res, next) {
  res.status(404).sendFile(__dirname + "/public/404.html");
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack, { route: req.path });
  res.status(500).json({ error: "Something broke!" });
});

// Start the server
app.listen(port, () => {
  logger.info(`Server is listening on port ${port}`);
});
