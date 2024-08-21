// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {AxelarExecutable} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutable.sol";
import {IAxelarGasService} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGasService.sol";

interface ITicketFactory {
    function createTicket(
        bytes32 _identifier,
        address _msgSender,
        bytes memory _message
    ) external;
}

contract AxelarMRUBridge is AxelarExecutable {
    IAxelarGasService public immutable gasService;
    address public immutable appInbox;

    uint256 public constant GAS_LIMIT = 200000;

    event SentMessage(
        string indexed destination,
        address indexed sender,
        uint256 message
    );
    event ReceivedMessage(
        string indexed origin,
        address indexed sender,
        uint256 message
    );

    constructor(
        address _gateway,
        address _gasReceiver,
        address _appInbox
    ) AxelarExecutable(_gateway) {
        gasService = IAxelarGasService(_gasReceiver);
        appInbox = _appInbox;
    }

    function sendMessage(
        string calldata _destinationChain,
        string calldata _destinationAddress,
        uint256 _message
    ) external payable {
        uint256 fee = estimateGasFee(_destinationChain, _destinationAddress, _message);
        require(msg.value > fee, "Not enough gas fees");

        bytes memory payload = abi.encode(msg.sender, _message);

        gasService.payGas{value: msg.value}(
            address(this),
            _destinationChain,
            _destinationAddress,
            payload,
            GAS_LIMIT,
            true,
            msg.sender,
            new bytes(0)
        );

        gateway.callContract(_destinationChain, _destinationAddress, payload);

        emit SentMessage(_destinationChain, msg.sender, _message);
    }

    function _execute(
        string calldata _sourceChain,
        string calldata _sourceAddress,
        bytes calldata _payload
    ) internal override {
        (address sender, uint256 message) = abi.decode(
            _payload,
            (address, uint256)
        );

        require(appInbox != address(0), "AppInbox not set");
        bytes32 identifier = keccak256("AXELAR_MESSAGE");
        bytes memory mruMessage = abi.encode(message);
        ITicketFactory(appInbox).createTicket(identifier, sender, mruMessage);

        emit ReceivedMessage(_sourceChain, sender, message);
    }

    function estimateGasFee(
        string calldata _destinationChain,
        string calldata _destinationAddress,
        uint256 _message
    ) external view returns (uint256) {
        bytes memory payload = abi.encode(address(0), _message);
        return
            gasService.estimateGasFee(
                _destinationChain,
                _destinationAddress,
                payload,
                GAS_LIMIT,
                new bytes(0)
            );
    }
}
