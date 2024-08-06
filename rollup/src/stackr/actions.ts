import { ActionSchema, SolidityType } from "@stackr/sdk";

export const MintTokenSchema = new ActionSchema("mint-token", {
  address: SolidityType.ADDRESS,
  amount: SolidityType.UINT,
});
