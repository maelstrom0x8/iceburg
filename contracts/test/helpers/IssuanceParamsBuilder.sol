// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.26;

import {Issuance} from "../../src/Issuance.sol";

library IssuanceParamsBuilder {
    function defaults(address paymentToken, address securityToken, address attestor)
        internal
        view
        returns (Issuance.IssuanceParams memory)
    {
        address[] memory attestors = new address[](1);
        attestors[0] = attestor;

        return Issuance.IssuanceParams({
            supply: 1_000,
            reservePrice: 8_000_000,
            capBps: 1_500,
            minHolders: 5,
            minBond: 1_000_000,
            paymentToken: paymentToken,
            securityToken: securityToken,
            approvedAttestors: attestors,
            commitWindowEnd: uint64(block.timestamp + 1 days),
            revealWindowEnd: uint64(block.timestamp + 2 days),
            challengeWindowLength: 1 hours
        });
    }
}
