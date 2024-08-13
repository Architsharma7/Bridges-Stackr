import { ActionSchema, AllowedInputTypes, MicroRollup } from "@stackr/sdk";
import { HDNodeWallet, Wallet } from "ethers";
import { stackrConfig } from "../stackr.config.ts";
import { UpdateCounterSchema } from "./stackr/action.ts";
import { machine } from "./stackr/machine.ts";
import { Bridge } from "@stackr/sdk/plugins";
import { AbiCoder } from "ethers";

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


const main = async () => {
  const mru = await MicroRollup({
    config: stackrConfig,
    actionSchemas: [UpdateCounterSchema],
    stateMachines: [machine],
  });

  await mru.init();

  Bridge.init(mru, {
    handlers: {
      //@note: This is for Axelar Bridge, for the LayerZeroBridge, LZ_MESSAGE can be used.
      AXELAR_MESSAGE: async (args) => {
        console.log("args data:", args.data);
        const [timestamp] = abiCoder.decode(["uint256"], args.data);
        console.log("Decoded timestamp:", timestamp);
        const timestampNumber = Number(timestamp);
        const inputs = {
          timestamp: timestampNumber,
        }
        const signature = await signMessage(operator, UpdateCounterSchema, inputs);
        const incrementAction = UpdateCounterSchema.actionFrom({
          inputs,
          signature,
          msgSender: operator.address,
        });

        return {
          transitionName: "increment",
          action: incrementAction,
        };
      },
    },
  });
};

main();
