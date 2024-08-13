// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {OApp, Origin, MessagingFee} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface ITicketFactory {
    function createTicket(
        bytes32 _identifier,
        address _msgSender,
        bytes memory _message
    ) external;
}

contract LayerZeroMRUBridge is OApp {
    address public immutable appInbox;

    event SentMessage(
        uint32 indexed destination,
        address indexed sender,
        uint256 message
    );
    event ReceivedMessage(
        uint32 indexed origin,
        address indexed sender,
        uint256 message
    );

    constructor(
        address _endpoint,
        address _owner,
        address _appInbox
    ) OApp(_endpoint, _owner) Ownable(_owner) {
        appInbox = _appInbox;
    }

    function sendMessage(
        uint32 _dstEid,
        uint256 _message,
        bytes calldata _options
    ) external payable {
        bytes memory payload = abi.encode(msg.sender, _message);
        uint256 fee = estimateFee(_dstEid, _message, _options);
        require(msg.value >= fee, "Insufficient fee");
        _lzSend(
            _dstEid,
            payload,
            _options,
            MessagingFee(msg.value, 0),
            payable(msg.sender)
        );

        emit SentMessage(_dstEid, msg.sender, _message);
    }

    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address,
        bytes calldata
    ) internal override {
        (address sender, uint256 message) = abi.decode(
            _message,
            (address, uint256)
        );

        require(appInbox != address(0), "AppInbox not set");
        bytes32 identifier = keccak256("LZ_MESSAGE");
        bytes memory mruMessage = abi.encode(message);
        ITicketFactory(appInbox).createTicket(identifier, sender, mruMessage);

        emit ReceivedMessage(_origin.srcEid, sender, message);
    }

    function estimateFee(
        uint32 _dstEid,
        uint256 _message,
        bytes calldata _options
    ) public view returns (uint256 nativeFee) {
        bytes memory payload = abi.encode(address(0), _message);
        MessagingFee memory fee = _quote(_dstEid, payload, _options, false);
        return fee.nativeFee;
    }

    function setPeer(
        uint32 _eid,
        bytes32 _peer
    ) public virtual override onlyOwner {
        _setPeer(_eid, _peer);
    }
}
