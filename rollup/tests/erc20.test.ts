import { MicroRollup, MicroRollupResponse } from "@stackr/sdk";
import { StateMachine } from "@stackr/sdk/machine";
import { expect } from "chai";
import { Wallet } from "ethers";
import genesisState from "../genesis-state.json";
import { schemas } from "../src/stackr/actions.ts";
import { ERC20Machine } from "../src/stackr/erc20.ts";
import { ERC20 } from "../src/stackr/state.ts";
import { transitions } from "../src/stackr/transitions.ts";
import { stackrConfig } from "../stackr.config.ts";

const sleep = (timeInMs: number) =>
  new Promise((resolve) => setTimeout(resolve, timeInMs));

describe("ERC20 MRU", async () => {
  const { domain } = stackrConfig;
  let mru: MicroRollupResponse;

  const ALICE_ADDRESS =
    "0x0123456789012345678901234567890123456789012345678901234567890124";
  const BOB_ADDRESS =
    "0x0123456789012345678901234567890123456789012345678901234567890123";
  const CHARLIE_ADDRESS =
    "0x0123456789012345678901234567890123456789012345678901234567890125";

  const aliceWallet = new Wallet(ALICE_ADDRESS);
  const bobWallet = new Wallet(BOB_ADDRESS);
  const charlieWallet = new Wallet(CHARLIE_ADDRESS);

  const STATE_MACHINES = {
    ERC20: "erc-20",
  };

  const machine = new StateMachine({
    id: STATE_MACHINES.ERC20,
    stateClass: ERC20,
    initialState: genesisState.state,
    on: transitions,
  });

  beforeEach(async () => {
    mru = await MicroRollup({
      config: {
        ...stackrConfig,
        sequencer: {
          blockSize: 1,
          blockTime: 1,
        },
        logLevel: "error",
      },
      actionSchemas: [...Object.values(schemas)],
      stateMachines: [machine],
    });
    await mru.init();
  });

  describe("Create and Mint", async () => {
    it("should create an account", async () => {
      const actionName = "create";
      const schema = schemas[actionName];
      const msgSender = bobWallet.address;
      const inputs = {
        address: msgSender,
      };

      const signature = await bobWallet.signTypedData(
        domain,
        schemas.create.EIP712TypedData.types,
        inputs
      );

      const action = schema.actionFrom({ msgSender, signature, inputs });
      const ack = await mru.submitAction(actionName, action);

      expect(action.hash).to.equal(ack.actionHash);

      await sleep(100);

      const erc20Machine = mru.stateMachines.get<ERC20Machine>(
        STATE_MACHINES.ERC20
      );

      if (!erc20Machine) {
        throw new Error("ERC20 machine not found");
      }

      const accounts = erc20Machine.state;
      expect(accounts.length).to.equal(1);
    });

    it("should mint tokens", async () => {
      const actionName = "mint";
      const schema = schemas[actionName];
      const msgSender = bobWallet.address;
      const MINT_AMOUNT = 1000;
      const inputs = {
        to: msgSender,
        from: msgSender,
        amount: MINT_AMOUNT,
        nonce: 1,
      };

      const signature = await bobWallet.signTypedData(
        domain,
        schemas.mint.EIP712TypedData.types,
        inputs
      );

      const action = schema.actionFrom({ msgSender, signature, inputs });
      const ack = await mru.submitAction(actionName, action);

      expect(action.hash).to.equal(ack.actionHash);

      await sleep(100);

      const erc20Machine = mru.stateMachines.get<ERC20Machine>(
        STATE_MACHINES.ERC20
      );

      if (!erc20Machine) {
        throw new Error("ERC20 machine not found");
      }

      const accounts = erc20Machine.state;
      const bobsAccount = accounts.find(
        (account) => account.address === bobWallet.address
      );

      if (!bobsAccount) {
        throw new Error("Bob's account not found");
      }

      expect(bobsAccount.balance).to.equal(MINT_AMOUNT);
    });
  });

  afterEach(async () => {
    await mru.shutdown();
  });
});
