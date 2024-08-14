import { STF, Transitions, REQUIRE } from "@stackr/sdk/machine";
import { BridgeState } from "./machines.stackr";

const mintToken: STF<BridgeState> = {
  handler: ({ state, inputs }) => {
    const accountIdx = state.findIndex(
      (account) => account.address === inputs.address
    );

    if (accountIdx === -1) {
      state.push({
        address: inputs.address,
        balance: inputs.amount,
      });
    } else {
      state[accountIdx].balance += inputs.amount;
    }

    return state;
  },
};

export const transitions: Transitions<BridgeState> = {
  mintToken,
};