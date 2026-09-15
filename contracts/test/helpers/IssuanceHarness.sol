// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.26;

import {Issuance} from "../../src/Issuance.sol";

contract IssuanceHarness is Issuance {
    constructor(IssuanceParams memory params_, address issuer_) Issuance(params_, issuer_) {}

    function forceStandingUnresolvedClaim(address proposer, uint256 bond, uint64 deadline) external {
        state = State.CHALLENGE_OPEN;
        _setStandingProposal(0, new uint256[](0), proposer, bond, deadline, true);
    }
}
