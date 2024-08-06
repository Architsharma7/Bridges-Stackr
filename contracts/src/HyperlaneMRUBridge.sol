// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IMailbox} from "../interfaces/IMailbox.sol";

interface ITicketFactory {
    function createTicket(
        bytes32 _identifier,
        address _msgSender,
        bytes memory _message
    ) external;
}

interface IMessageRecipient {
    function handle(
        uint32 _origin,
        bytes32 _sender,
        bytes calldata _message
    ) external payable;
}

contract HyperlaneMRUBridge is IMessageRecipient {
    using SafeERC20 for IERC20;
    using TypeCasts for address;
    using TypeCasts for bytes32;

    IMailbox public immutable mailbox;
    address public immutable appInbox;
    uint32 public immutable bridgeDomain;
    uint32 public constant MRU_DOMAIN = 11155111; // Sepolia domain (MRU)

    event SentTransferRemote(
        uint32 indexed destination,
        bytes32 indexed recipient,
        address token,
        uint256 amount
    );
    event ReceivedTransferRemote(
        uint32 indexed origin,
        address indexed recipient,
        address token,
        uint256 amount
    );

    modifier onlyMailbox() {
        require(
            msg.sender == address(mailbox),
            "Only mailbox can call this function"
        );
        _;
    }

    constructor(address _mailbox, address _appInbox, uint32 _localDomain) {
        mailbox = IMailbox(_mailbox);
        appInbox = _appInbox;
        bridgeDomain = _localDomain;
    }

    function estimateTransferRemoteFee(
        uint32 _destination,
        address _recipient,
        address _token,
        uint256 _amount
    ) public view returns (uint256) {
        bytes memory message = abi.encode(_token, _amount);
        return
            mailbox.quoteDispatch(
                _destination,
                TypeCasts.addressToBytes32(_recipient),
                message
            );
    }

    function transferRemote(
        uint32 _destination,
        address _recipient,
        address _token,
        uint256 _amount
    ) external payable {
        require(_amount > 0, "Amount must be greater than 0");

        uint256 fee = estimateTransferRemoteFee(
            _destination,
            _recipient,
            _token,
            _amount
        );
        require(msg.value >= fee, "Insufficient fee");

        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);

        mailbox.dispatch{value: msg.value}(
            _destination,
            TypeCasts.addressToBytes32(_recipient),
            abi.encode(_token, _amount)
        );

        emit SentTransferRemote(
            _destination,
            TypeCasts.addressToBytes32(_recipient),
            _token,
            _amount
        );
    }

    function handle(
        uint32 _origin,
        bytes32 _sender,
        bytes calldata _message
    ) external payable onlyMailbox {
        (address token, uint256 amount) = abi.decode(
            _message,
            (address, uint256)
        );
        address recipient = _sender.bytes32ToAddress();

        if (bridgeDomain == MRU_DOMAIN) {
            require(appInbox != address(0), "AppInbox not set");
            bytes memory mruMessage = abi.encode(token, recipient, amount);
            bytes32 identifier = keccak256("BRIDGE_TOKEN");
            ITicketFactory(appInbox).createTicket(
                identifier,
                recipient,
                mruMessage
            );
        } else {
            IERC20(token).safeTransfer(recipient, amount);
        }

        emit ReceivedTransferRemote(_origin, recipient, token, amount);
    }
}
