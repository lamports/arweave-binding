import express, { Application, Request, Response } from "express";
import BaseRouter from "./src/routes/index.route";

const app: Application = express();
const port = 4000;

// Body parsing Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/", BaseRouter);

try {
  app.listen(port, (): void => {
    console.log(`Connected successfully on port ${port}`);
  });
} catch (error) {
  console.error(`Error occurred: ${error}`);
}
