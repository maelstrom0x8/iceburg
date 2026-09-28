// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {AttestorRegistry} from "../src/AttestorRegistry.sol";

contract DeployAttestorRegistryScript is Script {
    // Anvil's publicly-known default account #1 — its private key is not a
    // secret. Approving it as an attestor is fine for a local demo chain but
    // would make the "demo attestor" cryptographically worthless (anyone can
    // sign as it) if this script were ever run against a real network.
    address constant DEMO_ATTESTOR = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
    uint256 constant ANVIL_CHAIN_ID = 31337;

    function run() public {
        require(block.chainid == ANVIL_CHAIN_ID, "DeployAttestorRegistry: local Anvil only");

        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        AttestorRegistry registry = new AttestorRegistry(deployer);
        registry.approveAttestor(DEMO_ATTESTOR);

        vm.stopBroadcast();

        console.log("AttestorRegistry deployed at:", address(registry));
    }
}
