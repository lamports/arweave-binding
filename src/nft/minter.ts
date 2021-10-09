require("dotenv").config();

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import "dotenv/config";

import * as anchor from "@project-serum/anchor";
import { MintLayout, Token } from "@solana/spl-token";
import axios from "axios";
import {
  StringPublicKey,
  createMint,
  toPublicKey,
  findProgramAddress,
  createAssociatedTokenAccountInstruction,
  createMetadata,
  Data,
  updateMetadata,
  createMasterEdition,
  Creator,
} from "./accounts";
import { sendTransactionWithRetry } from "./transactions";
import fs from "fs";
import * as path from "path";
import { LocalFileData } from "get-file-object-from-local-path";
import FormData from "form-data";
import crypto from "crypto";
import log from "loglevel";

export const AR_SOL_HOLDER_ID = new PublicKey(
  "HvwC9QSAzvGXhhVrgPmauVwFWcYZhne3hVot9EbHuFTm"
);
export const EXTENSION_PNG = ".png";
const RESERVED_TXN_MANIFEST = "manifest.json";

export type Attribute = {
  trait_type?: string;
  display_type?: string;
  value: string | number;
};

interface ImageMetadata {
  manifestJson: MetadataJSON;
  manifestPath: string;
  imagePath: string;
}

export interface MetadataJSON {
  name: string;
  symbol: string;
  description: string;
  image: string | undefined;
  animation_url: string | undefined;
  attributes: Attribute[] | undefined;
  external_url: string;
  properties: any;
  creators: Creator[] | null;
  sellerFeeBasisPoints: number;
}

export const getImagesAndMetadata = (
  currentFileIndex: number,
  requiredFiles: number
): ImageMetadata[] => {
  const newFiles: string[] = [];
  const imagesPath: string =
    process.env.IMAGE_FOLDER == undefined
      ? "../images"
      : process.env.IMAGE_FOLDER;
  const imageAndMetaData: ImageMetadata[] = [];
  //console.log(imagesPath);
  for (
    let index = currentFileIndex;
    index < currentFileIndex + requiredFiles;
    index++
  ) {
    const value = fs
      .readdirSync(imagesPath.toString())
      .map((file) => path.join(imagesPath, file));
    newFiles.push(...value);
  }

  const images = newFiles.filter((val) => path.extname(val) === EXTENSION_PNG);
  const SIZE = images.length;

  for (let i = 0; i < SIZE; i++) {
    const image = images[i];
    const imageName = path.basename(image);
    //const index = imageName.replace(EXTENSION_PNG, '');

    //log.debug(`Processing file: ${i}`);
    log.info(`Processing file: ${i}`);

    const manifestPath = image.replace(EXTENSION_PNG, ".json");
    const manifestContent = fs
      .readFileSync(manifestPath)
      .toString()
      .replace(imageName, "image.png")
      .replace(imageName, "image.png");
    const manifest: MetadataJSON = JSON.parse(manifestContent);

    const result: ImageMetadata = {
      manifestJson: manifest,
      manifestPath: manifestPath,
      imagePath: image,
    };
    imageAndMetaData.push(result);
  }

  return imageAndMetaData;
};

const mintNFT = async (
  connection: Connection,
  wallet: anchor.Wallet | undefined,
  env: string,
  imageAndMetaData: ImageMetadata,
  maxSupply?: number
): Promise<{
  metadataAccount: StringPublicKey | undefined;
} | void> => {
  if (!wallet?.publicKey) return;

  const metadata = {
    name: imageAndMetaData.manifestJson.name,
    symbol: imageAndMetaData.manifestJson.symbol,
    description: imageAndMetaData.manifestJson.description,
    seller_fee_basis_points: imageAndMetaData.manifestJson.sellerFeeBasisPoints,
    image: imageAndMetaData.manifestJson.image,
    animation_url: imageAndMetaData.manifestJson.animation_url,
    attributes: imageAndMetaData.manifestJson.attributes,
    external_url: imageAndMetaData.manifestJson.external_url,
    properties: {
      ...imageAndMetaData.manifestJson.properties,
      creators: imageAndMetaData.manifestJson.creators?.map((creator) => {
        return {
          address: creator.address,
          share: creator.share,
        };
      }),
    },
    //creators: imageAndMetaData.manifestJson.creators,
    //sellerFeeBasisPoints: imageAndMetaData.manifestJson.sellerFeeBasisPoints,
  };

  const imageFile: File = (await new LocalFileData(
    imageAndMetaData.imagePath
  )) as File;
  const metaJsonFile: File = await new LocalFileData(
    imageAndMetaData.manifestPath
  );

  //const filey = fs.readFileSync(imageAndMetaData.imagePath);

  //new filey

  const realFiles: File[] = [];
  realFiles.push(imageFile);
  realFiles.push(metaJsonFile);

  //log.error('FILEEE SIZEEE , {}', sizeof(realFiles[0]));

  const { instructions: pushInstructions, signers: pushSigners } =
    await prepPayForFilesTxn(wallet, realFiles);

  const TOKEN_PROGRAM_ID = new PublicKey(
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
  );

  // Allocate memory for the account
  const mintRent = await connection.getMinimumBalanceForRentExemption(
    MintLayout.span
  );

  const payerPublicKey = wallet.publicKey.toBase58();
  const instructions: TransactionInstruction[] = [...pushInstructions];
  const signers: Keypair[] = [...pushSigners];

  // This is only temporarily owned by wallet...transferred to program by createMasterEdition below
  const mintKey = createMint(
    instructions,
    wallet.publicKey,
    mintRent,
    0,
    // Some weird bug with phantom where it's public key doesnt mesh with data encode wellff
    toPublicKey(payerPublicKey),
    toPublicKey(payerPublicKey),
    signers
  ).toBase58();

  const recipientKey = (
    await findProgramAddress(
      [
        wallet.publicKey.toBuffer(),
        new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").toBuffer(),
        toPublicKey(mintKey).toBuffer(),
      ],
      new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
    )
  )[0];

  createAssociatedTokenAccountInstruction(
    instructions,
    toPublicKey(recipientKey),
    wallet.publicKey,
    wallet.publicKey,
    toPublicKey(mintKey)
  );

  const metadataAccount = await createMetadata(
    new Data({
      symbol: metadata.symbol,
      name: metadata.name,
      uri: " ".repeat(64), // size of url for arweave
      sellerFeeBasisPoints: metadata.seller_fee_basis_points,
      creators: metadata.properties.creators,
    }),
    payerPublicKey,
    mintKey,
    payerPublicKey,
    instructions,
    wallet.publicKey.toBase58()
  );

  // TODO: enable when using payer account to avoid 2nd popup
  // const block = await connection.getRecentBlockhash('singleGossip');
  // instructions.push(
  //   SystemProgram.transfer({
  //     fromPubkey: wallet.publicKey,
  //     toPubkey: payerPublicKey,
  //     lamports: 0.5 * LAMPORTS_PER_SOL // block.feeCalculator.lamportsPerSignature * 3 + mintRent, // TODO
  //   }),
  // );

  const { txid } = await sendTransactionWithRetry(
    connection,
    wallet,
    instructions,
    signers
  );

  try {
    await connection.confirmTransaction(txid, "max");
  } catch {
    // ignore
  }

  // Force wait for max confirmations
  // await connection.confirmTransaction(txid, 'max');
  await connection.getParsedConfirmedTransaction(txid, "confirmed");

  // this means we're done getting AR txn setup. Ship it off to ARWeave!
  const data = new FormData();

  const tags = realFiles.reduce(
    (acc: Record<string, Array<{ name: string; value: string }>>, f) => {
      acc[f.name] = [{ name: "mint", value: mintKey }];
      return acc;
    },
    {}
  );
  data.append("tags", JSON.stringify(tags));
  data.append("transaction", txid);
  // data.append('transaction', 'HpLu6rgNcudzAvMcfTwFT8k07dwXp5vd4goQdRy90b8');

  // realFiles.map(f => data.append('file[]', f));

  const manifestContent = fs
    .readFileSync(imageAndMetaData.manifestPath)
    .toString()
    .replace("0", "image")
    .replace("0", "image");
  const manifest = JSON.parse(manifestContent);

  const manifestBuffer = Buffer.from(JSON.stringify(manifest));

  data.append("file[]", fs.createReadStream(imageAndMetaData.imagePath), {
    filename: `image.png`,
    contentType: "image/png",
  });
  data.append("file[]", manifestBuffer, "metadata.json");

  // data.append()

  // TODO: convert to absolute file name for image
  const result: any = (
    await axios.post(
      env.startsWith("mainnet-beta")
        ? "https://us-central1-principal-lane-200702.cloudfunctions.net/uploadFileProd2"
        : "https://us-central1-principal-lane-200702.cloudfunctions.net/uploadFile2",
      data,
      { headers: data.getHeaders() }
    )
  ).data;

  console.log("RESULLTT ARWEAVEEE  {}", result);

  const metadataFile = result["messages"].find(
    (m: any) => m.filename === RESERVED_TXN_MANIFEST
  );
  if (metadataFile?.transactionId && wallet.publicKey) {
    const updateInstructions: TransactionInstruction[] = [];
    const updateSigners: Keypair[] = [];

    // TODO: connect to testnet arweave
    const arweaveLink = `https://arweave.net/${metadataFile.transactionId}`;
    await updateMetadata(
      new Data({
        name: metadata.name,
        symbol: metadata.symbol,
        uri: arweaveLink,
        creators: metadata.properties.creators,
        sellerFeeBasisPoints: metadata.seller_fee_basis_points,
      }),
      undefined,
      undefined,
      mintKey,
      payerPublicKey,
      updateInstructions,
      metadataAccount
    );

    updateInstructions.push(
      Token.createMintToInstruction(
        TOKEN_PROGRAM_ID,
        toPublicKey(mintKey),
        toPublicKey(recipientKey),
        toPublicKey(payerPublicKey),
        [],
        1
      )
    );
    // // In this instruction, mint authority will be removed from the main mint, while
    // // minting authority will be maintained for the Printing mint (which we want.)
    await createMasterEdition(
      maxSupply !== undefined ? new anchor.BN(maxSupply) : undefined,
      mintKey,
      payerPublicKey,
      payerPublicKey,
      payerPublicKey,
      updateInstructions
    );

    const txid = await sendTransactionWithRetry(
      connection,
      wallet,
      updateInstructions,
      updateSigners
    );
  }

  console.log("META DATAAA ACCCOUNT ", metadataAccount);

  return undefined;
  //return { metadataAccount };
};

const prepPayForFilesTxn = async (
  wallet: anchor.Wallet,
  files: File[]
): Promise<{
  instructions: TransactionInstruction[];
  signers: Keypair[];
}> => {
  const memo = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
  const instructions: TransactionInstruction[] = [];
  const signers: Keypair[] = [];

  if (wallet.publicKey) {
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: AR_SOL_HOLDER_ID,
        lamports: 2300000, //await getAssetCostToStore(files),
      })
    );
  }
  for (let i = 0; i < files.length; i++) {
    const hashSum = crypto.createHash("sha256");
    hashSum.update(JSON.stringify(files[i]));
    const hex = hashSum.digest("hex");
    const instruction = new TransactionInstruction({
      keys: [],
      programId: memo,
      data: Buffer.from(hex),
    });
    instructions.push(instruction);
  }

  return {
    instructions,
    signers,
  };
};
