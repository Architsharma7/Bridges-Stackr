import { ActionSchema, AllowedInputTypes, MicroRollup } from "@stackr/sdk";
import { Bridge } from "@stackr/sdk/plugins";
import { Wallet, AbiCoder, formatUnits } from "ethers";
import dotenv from "dotenv";

import { stackrConfig } from "../stackr.config.ts";
import { machine } from "./stackr/machines.stackr.ts";
import { MintTokenSchema } from "./stackr/actions.ts";

dotenv.config();

const abiCoder = AbiCoder.defaultAbiCoder();
const operator = new Wallet(process.env.PRIVATE_KEY as string);

const signMessage = async (
  wallet: Wallet,
  schema: ActionSchema,
  payload: AllowedInputTypes
) => {
  const signature = await wallet.signTypedData(
    schema.domain,
    schema.EIP712TypedData.types,
    payload
  );
  return signature;
};

async function main() {
  const rollup = await MicroRollup({
    config: stackrConfig,
    actionSchemas: [MintTokenSchema],
    stateMachines: [machine],
    stfSchemaMap: {
      mintToken: MintTokenSchema.identifier,
    },
  });
  await rollup.init();

  Bridge.init(rollup, {
    handlers: {
      BRIDGE_TOKEN: async (args) => {
        console.log("args data:", args.data);
        const [_token, _amount, _to] = abiCoder.decode(
          ["address", "uint256", "address"],
          args.data
        );
        console.log("Minting token to", _to, "with amount", _amount);

        const data = args.data.startsWith('0x') ? args.data.slice(2) : args.data;
        const token = '0x' + data.slice(24, 64);
        const to = '0x' + data.slice(88, 128);
        const amount = BigInt('0x' + data.slice(152));
  
        console.log("Decoded token:", token);
        console.log("Decoded to:", to);
        console.log("Decoded amount:", amount.toString());
        const inputs = {
          address: to,
          amount: amount.toString(),
        };

        console.log("inputs:", inputs);
        const signature = await signMessage(operator, MintTokenSchema, inputs);
        const action = MintTokenSchema.actionFrom({
          inputs,
          signature,
          msgSender: operator.address,
        });

        return {
          transitionName: "mintToken",
          action: action,
        };
      },
    },
  });
}

main();
