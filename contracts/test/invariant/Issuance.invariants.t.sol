// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {Issuance} from "../../src/Issuance.sol";
import {IssuanceHandler} from "./IssuanceHandler.sol";

contract IssuanceInvariantsTest is Test {
    IssuanceHandler handler;

    function setUp() public {
        handler = new IssuanceHandler();
        targetContract(address(handler));
    }

    function invariant_capNeverExceededOnceSettled() public view {
        Issuance issuance = handler.issuance();
        if (!issuance.finalized() || issuance.state() != Issuance.State.SETTLED) return;

        (, uint256[] memory allocations,,,,) = issuance.standingProposal();
        uint256 bidCap = issuance.cap();
        for (uint256 i = 0; i < allocations.length; i++) {
            assertLe(allocations[i], bidCap, "INV-3/INV-4: allocation exceeded the concentration cap");
        }
    }

    function invariant_supplyNeverExceededOnceSettled() public view {
        Issuance issuance = handler.issuance();
        if (!issuance.finalized() || issuance.state() != Issuance.State.SETTLED) return;

        (, uint256[] memory allocations,,,,) = issuance.standingProposal();
        uint256 total;
        for (uint256 i = 0; i < allocations.length; i++) {
            total += allocations[i];
        }
        assertLe(total, 300, "INV-2: total allocated exceeded supply");
    }

    function invariant_mintedMatchesFinalAllocation() public view {
        Issuance issuance = handler.issuance();
        if (!issuance.finalized() || issuance.state() != Issuance.State.SETTLED) return;

        uint256 n = issuance.bidCount();
        (, uint256[] memory allocations,,,,) = issuance.standingProposal();
        for (uint256 i = 0; i < n; i++) {
            Issuance.Bid memory b = issuance.bidAt(i);
            assertEq(
                handler.securityToken().balanceOf(b.bidder),
                allocations[i],
                "INV-1: minted balance does not match the settled allocation"
            );
        }
    }

    function invariant_noResidualPaymentTokenAfterFinalization() public view {
        Issuance issuance = handler.issuance();
        if (!issuance.finalized()) return;

        assertEq(
            handler.paymentToken().balanceOf(address(issuance)),
            0,
            "settle/cancelUnresolved left a residual, unaccounted-for balance in the contract"
        );
    }

    function invariant_finalizedIsMonotonic() public view {
        Issuance issuance = handler.issuance();
        if (!issuance.finalized()) return;

        Issuance.State s = issuance.state();
        assertTrue(
            s == Issuance.State.SETTLED || s == Issuance.State.CANCELLED,
            "finalized=true but state is neither SETTLED nor CANCELLED"
        );
    }
}
