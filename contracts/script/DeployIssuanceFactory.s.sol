// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {IssuanceFactory} from "../src/IssuanceFactory.sol";

contract DeployIssuanceFactoryScript is Script {
    function run() public {
        vm.startBroadcast();

        IssuanceFactory factory = new IssuanceFactory();

        vm.stopBroadcast();

        console.log("IssuanceFactory deployed at:", address(factory));
    }
}
