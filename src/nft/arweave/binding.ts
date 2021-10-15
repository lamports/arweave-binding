require("dotenv").config();

import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import fs from "fs";
import { getAssetCostInWinston } from "./fee.arweave";
import { MetadataJSON } from "./Metadata";

// const arweave = Arweave.init({
//   host: "127.0.0.1",
//   port: 1984,
//   protocol: "http",
// });

const arweave = Arweave.init({
  host: "arweave.net",
  port: 443,
  protocol: "https",
});

const getWallet = async (): Promise<JWKInterface> => {
  const result = await arweave.wallets.generate();
  //console.log(result);
  return result;
};
export default getWallet;

export const ARWEAVE_LINK = "https://arweave.net/";

export const sendMyTransaction = async (
  payerKey: JWKInterface
): Promise<{ tx_id: string; result: any }> => {
  const key = await arweave.wallets.generate();
  const sendAddress = await getWalletAddress(key);
  //const payerAddress = await getWalletAddress(payerKey);
  let tx = await arweave.createTransaction({
    target: sendAddress,
    data: JSON.stringify("{'test' : 'sending something'}"),
  });
  tx.addTag("Srinivas", "valekar");
  await arweave.transactions.sign(tx, payerKey);
  let tx_id = tx.id; // Get transaction id from signed transaction
  const result = await arweave.transactions.post(tx);
  console.log(result);
  return { tx_id, result };
};

export const getBalance = async (key: JWKInterface) => {
  return arweave.wallets.getBalance(await getWalletAddress(key));
};

export const getWalletAddress = async (key: any) => {
  return await arweave.wallets.jwkToAddress(key);
};

export const createNftTransaction = async (
  payerKey: JWKInterface,
  imagePath: string,
  metadataJSONPath: string
): Promise<any | undefined> => {
  const metadataJsonBuffer = fs.readFileSync(metadataJSONPath);
  const image = fs.readFileSync(imagePath);

  const costInWinston = await getAssetCostInWinston(image, metadataJsonBuffer);

  const payerBalance = await getBalance(payerKey);
  const payerBalanceInAr = arweave.ar.winstonToAr(payerBalance);
  // check if balance in more than transaction cost
  if (Number.parseFloat(payerBalanceInAr) > costInWinston) {
    //create image transaction and send it
    let imageTrnx = await arweave.createTransaction({
      data: image,
    });
    imageTrnx.addTag("Content-Type", "image/png");
    await arweave.transactions.sign(imageTrnx, payerKey);

    const imageResult = await arweave.transactions.post(imageTrnx);

    if (imageResult.status === 200) {
      const updatedMetadataJson = updateMetadata(
        metadataJsonBuffer,
        imageTrnx.id
      );
      const updatedMetadataJsonBuffer = Buffer.from(
        JSON.stringify(updatedMetadataJson)
      );

      let metadataTrnx = await arweave.createTransaction({
        data: updatedMetadataJsonBuffer,
      });

      metadataTrnx.addTag("Content-Type", "application/json");

      await arweave.transactions.sign(metadataTrnx, payerKey);
      const metaResult = await arweave.transactions.post(metadataTrnx);

      const result = [
        {
          filename: "image.png",
          success: imageResult.statusText,
          transactionId: imageTrnx.id,
        },
        {
          filename: "manifest.json",
          success: metaResult.statusText,
          transactionId: metadataTrnx.id,
        },
      ];
      return result;
    } else {
      throw Error("Could not store the image");
    }
  } else {
    throw Error("Not enough Winstons, please purchase some arweaves");
  }
};

const updateMetadata = (
  metadataJSONBuffer: Buffer,
  imageTransactionId: string
) => {
  const metadataJSON: MetadataJSON = JSON.parse(metadataJSONBuffer.toString());

  const imageUrl = ARWEAVE_LINK + imageTransactionId + "?ext=png";

  metadataJSON.image = imageUrl;
  metadataJSON.properties.files[0].uri = imageUrl;
  metadataJSON.properties.files[0].type = "image/png";

  return metadataJSON;
};
