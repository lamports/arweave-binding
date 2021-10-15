import { NextFunction, Request, Response, Router } from "express";
import getWallet, {
  createNftTransaction,
  getBalance,
  getWalletAddress,
  sendMyTransaction,
} from "../nft/arweave/binding";

export const arweaveController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    //const pubKey = await callMinter();
    const payerWallet = await getWallet();
    // const address = await getWalletAddress(result);
    // const trnx = await sendMyTransaction(payerWallet);

    // const balance = await getBalance(payerWallet);

    const result = await createNftTransaction(
      payerWallet,
      process.env.SAMPLE_IMAGE,
      process.env.SAMPLE_JSON
    );

    //const result = getMetadataChanges(process.env.SAMPLE_JSON);

    return res.status(200).send({
      result: result,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send({
      message: err,
    });
  }
};
