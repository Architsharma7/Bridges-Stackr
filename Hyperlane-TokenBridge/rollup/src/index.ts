import { ActionSchema, AllowedInputTypes, MicroRollup } from "@stackr/sdk";
import { Bridge } from "@stackr/sdk/plugins";
import { Wallet, AbiCoder, formatEther } from "ethers";
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
        const [_token, _to, _amount] = abiCoder.decode(
          ["address", "address", "uint256"],
          args.data
        );
        console.log("Minting token to", _to, "with amount", Number(_amount));
        const inputs = {
          address: _to,
          amount: Number(formatEther(_amount)),
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
