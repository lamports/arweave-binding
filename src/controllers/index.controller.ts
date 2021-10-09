import { NextFunction, Request, Response, Router } from "express";
import callMinter from "../nft/crank";

export const indexController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const pubKey = await callMinter();

    return res.status(200).send({
      message: pubKey,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send({
      message: err,
    });
  }
};
