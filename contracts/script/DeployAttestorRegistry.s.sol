// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {AttestorRegistry} from "../src/AttestorRegistry.sol";

contract DeployAttestorRegistryScript is Script {
    address constant DEMO_ATTESTOR = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;

    function run() public {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        AttestorRegistry registry = new AttestorRegistry(deployer);
        registry.approveAttestor(DEMO_ATTESTOR);

        vm.stopBroadcast();

        console.log("AttestorRegistry deployed at:", address(registry));
    }
}
