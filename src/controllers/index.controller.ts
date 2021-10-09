import { NextFunction, Request, Response, Router } from "express";

export const indexController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    return res.status(200).send({
      message: "Hello world",
    });
  } catch (err) {
    console.log(err);
  }
};
