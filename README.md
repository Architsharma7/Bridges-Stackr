# Bridging Integration with Stackr Micro-rollup

## Overview

This guide provides the needed code to set up a cross-chain bridge for message passing/token bridging from any other chain to Stackr’s Micro-rollups.

## Pre-requisites

Before you begin reading this, please ensure you know these or go through the following:

- Basic understanding of Stackr’s Micro-rollup. https://docs.stf.xyz/build/zero-to-one/getting-started
- Basic understanding of cross-chain bridges:  https://chain.link/education-hub/cross-chain-bridge

## Project Structure

```
├── GMP
│   ├── contracts
│   │   ├── AxelarMRUBridge.sol
│   │   ├── LayerZeroMRUBridge.sol
│   │   └── constants
│   └── rollup
├── Hyperlane-TokenBridge
│   ├── contracts
│   │   ├── constants
│   │   ├── interfaces
│   │   ├── lib
│   │   └── src
│   │       └── HyperlaneMRUBridge.sol 
│   └── rollup
```

## How to run?

### **Deployments**

Deploy the `Bridge` contract present in the contracts folder on two chains.

- **Origin chain:** Any chain of your choice and supported by Hyperlane/Axelar/LayerZero
    
    Supported Networks : (https://docs.hyperlane.xyz/docs/reference/contract-addresses) | https://docs.axelar.dev/dev/reference/testnet-contract-addresses | https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts
    
- **Destination Chain:** It will be Ethereum Sepolia because the AppInbox is deployed on it.

The constructor arguments for each contract are listed below:

### **Hyperlane**

**Constructor Arguments**

- **Mailbox Addresses:** https://docs.hyperlane.xyz/docs/reference/contract-addresses#mailbox
- **AppInbox address:** When deploying on the origin chain it will be `0x0000000000000000000000000000000000000000` and when on Sepolia, it will be the AppInbox address, which can be found in the `deployment.json` of your rollup.
- **Local Domain:** Domain ID of the chain you are deploying the contract to. For Sepolia, it is $11155111$

### **Axelar**

**Constructor Arguments**

- **_gateway, _gasReceiver:** https://docs.axelar.dev/dev/reference/testnet-contract-addresses
- **AppInbox address:** When deploying on the origin chain it will be `0x0000000000000000000000000000000000000000` and when on Sepolia, it will be the AppInbox address, which can be found in the `deployment.json` of your rollup.

### LayerZero

**Constructor Arguments**

- **_endpoint**:  endpoint address for your current chain.  https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts
- **_owner:** address of the owner of your contract, can be any address
- **AppInbox address:** When deploying on the origin chain it will be `0x0000000000000000000000000000000000000000` and when on Sepolia, it will be the AppInbox address, which can be found in the `deployment.json` of your rollup.

In the case of **LayerZero, t**o connect your OApp deployments together, you will need to call `setPeer` on both chains.

Arguments for `setPeer` function:

- **_eid:** the **destination** endpoint ID for the other chain (chain you want to bridge from)
- **_peer**: the destination OApp contract address in `bytes32` format.
    
    This function can be used to get the bytes32 format from the peer address (destination OApp Bridge contract address)(chain you want to bridge from)
    
    ```solidity
    function addressToBytes32(address _addr) public pure returns (bytes32) {
            return bytes32(uint256(uint160(_addr)));
    }
    ```
    

### **Set Bridge and Run MRU**

Now that we have deployed our contracts, it is time to set the bridge contract address in the AppInbox so that it can create a ticket.

It can be easily done using the CLI:https://docs.stf.xyz/build/plugins/bridging#2-set-the-bridge-on-the-appinbox 

or using Etherscan, by calling the `setBridge` function using the operator wallet and passing the deployed sepolia Token Bridge’s address as input.

After that run the MRU using the command 

`bun run src/index.ts`

### **Approve Tokens**

Since the tokens will be locked in the Token bridge contract on the origin chain, the contract needs approval for the tokens to be spent. To achieve this, call the `approve` function on the ERC-20 contract and pass the Token Bridge’s address of the origin chain as `spender` and any value you want.

### **Bridging**

Just 2 more steps to bridge tokens to the MRU

### Hyperlane

- First, pass in the inputs for the `estimateTransferRemoteFee` and call it to fetch the gas fees required for the transaction. The inputs can be:
    
          `_destination` : domain of the destination chain (will always be Sepolia)
    
    `_recipient` : address of the recipient contract (token bridge contract deployed on Sepolia)
    
    `_token` : address of the ERC20 token deployed on origin chain
    
    `_amount`: amount of the token to be locked on origin chain contract and minted on MRU.
    
    `_to`: address to which the tokens should be minted on MRU (could have been `msg.sender`, but user can have different address on rollup and origin chain).
    
- Pass the output of the function (in wei) in the `msg.value` and with all the parameters, call the `transferRemote` function.

### Axelar

- First, pass in the inputs for the `estimateGasFee` and call it to fetch the gas fees required for the transaction. The inputs can be:
    
    `_destinationChain` : The destination chain name
    
    `_destinationAddress` : The destination chain bridge contract address
    
    `_message` : Message you want to pass from one to other chain (can be of any type value)
    
- Pass the output of the function (in wei) in the `msg.value` and with all the parameters, call the `sendMessage` function.

### LayerZero

- First, pass in the inputs for the `estimateFee` and call it to fetch the gas fees required for the transaction. The inputs can be:
    
    `_dstEid` : EID for the destination chain
    
    `_message` : Message you want to pass from one to other chain (can be of any type value)
    
    `_options`: A bytes array that contains serialized execution options that tell the protocol the amount of gas to for the Executor to send when calling `lzReceive`, as well as other function call-related settings.
    
    For the sake of this guide, we will be passing this `0x000301001101000000000000000000000000000f4240` as the option
    
- Pass the output of the function (in wei) in the `msg.value` and with all the parameters, call the `sendMessage` function.