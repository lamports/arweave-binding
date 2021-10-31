import { NextFunction, Request, Response, Router } from "express";
import {
  //extendBorsh,
  getBorshBuffer,
  testCreator,
} from "../borsh/borsh.binding";

export const borshController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    //const pubKey = await callMinter();
    //const result = getBorshBuffer();
    // extendBorsh();
    const result = testCreator();
    return res.json({
      message: result,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send({
      message: err,
    });
  }
};
