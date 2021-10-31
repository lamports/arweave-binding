import { PublicKey } from "@solana/web3.js";
import * as borsh from "borsh";
import { BinaryReader, BinaryWriter } from "borsh";
import base58 from "bs58";
import { StringPublicKey } from "../nft/accounts";

class Test {
  x: Number;
  y: Number;

  constructor(args: { x: Number; y: Number }) {
    this.x = args.x;
    this.y = args.y;
  }
}

export const getBorshBuffer = (): Uint8Array => {
  const value = new Test({ x: 255, y: 20 });
  const vc = "GjQBdQ78Qdx7G6aZyq3svr4CmFackaEEWF9MHkPLawje";
  const schema = new Map([
    [
      Test,
      {
        kind: "struct",
        fields: [
          ["x", "u8"],
          ["y", "u64"],
        ],
      },
    ],
  ]);

  const buffer = borsh.serialize(schema, value);
  //const newValue = borsh.deserialize(schema, Test, buffer);
  return buffer;
  console.log(buffer);
};

export class BorshCreator {
  address: string;
  verified: boolean;
  share: number;

  constructor(args: { address: string; verified: boolean; share: number }) {
    this.address = args.address;
    this.verified = args.verified;
    this.share = args.share;
  }
}

export const BORSH_SCHEMA = new Map<any, any>([
  [
    BorshCreator,
    {
      kind: "struct",
      fields: [
        ["address", "string"],
        ["verified", "u8"],
        ["share", "u8"],
      ],
    },
  ],
]);

export const testCreator = (): Uint8Array => {
  const value = new BorshCreator({
    address: "GjQBdQ78Qdx7G6aZyq3svr4CmFackaEEWF9MHkPLawje",
    verified: true,
    share: 50,
  });

  const buffer = borsh.serialize(BORSH_SCHEMA, value);
  return buffer;
};
