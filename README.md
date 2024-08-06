# Hyperlane-MRU

Deploy the contract on both Scroll Sepolia and Sepolia with the appropriate parameters.
Add supported tokens using the addSupportedToken function on both deployments.
Implement the bridge handler in the MRU SDK as previously described.



Here's how it works:

On Scroll Sepolia:

Deploy the contract with the Hyperlane Mailbox and InterchainGasPaymaster addresses, and set the appInbox to the zero address.
Users call transferRemote to lock tokens and send them to Sepolia.
The _handle function will transfer tokens to recipients when receiving messages from Sepolia.


On Sepolia:

Deploy the contract with the Hyperlane Mailbox, InterchainGasPaymaster, and MRU AppInbox addresses.
The _handle function will create tickets in the MRU AppInbox when receiving messages from Scroll Sepolia.
Users can call transferRemote to send tokens back to Scroll Sepolia if needed.