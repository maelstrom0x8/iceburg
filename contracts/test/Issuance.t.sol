// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {Issuance} from "../src/Issuance.sol";
import {MockERC20} from "./helpers/MockERC20.sol";
import {IssuanceParamsBuilder} from "./helpers/IssuanceParamsBuilder.sol";

contract IssuanceConstructorTest is Test {
    MockERC20 paymentToken;
    address securityToken = makeAddr("securityToken");
    address attestor = makeAddr("attestor");
    address issuer = makeAddr("issuer");

    function setUp() public {
        paymentToken = new MockERC20();
    }

    function _params() internal view returns (Issuance.IssuanceParams memory) {
        return IssuanceParamsBuilder.defaults(address(paymentToken), securityToken, attestor);
    }

    function test_createIssuance() public {
        Issuance.IssuanceParams memory p = _params();

        vm.expectEmit(true, false, false, true);
        emit Issuance.IssuanceCreated(
            issuer,
            p.supply,
            p.reservePrice,
            (uint256(p.capBps) * p.supply) / 10_000,
            p.minHolders,
            p.minBond,
            p.paymentToken,
            p.securityToken,
            p.commitWindowEnd,
            p.revealWindowEnd,
            p.challengeWindowLength
        );
        Issuance issuance = new Issuance(p, issuer);

        assertEq(issuance.issuer(), issuer);
        assertEq(issuance.cap(), 150);
        assertEq(uint256(issuance.state()), uint256(Issuance.State.COMMIT_OPEN));
        assertEq(issuance.bidCount(), 0);

        address[] memory attestors = issuance.approvedAttestors();
        assertEq(attestors.length, 1);
        assertEq(attestors[0], attestor);
    }

    function test_createIssuance_revertsForZeroIssuer() public {
        vm.expectRevert(Issuance.ZeroAddress.selector);
        new Issuance(_params(), address(0));
    }

    function test_createIssuance_revertsForZeroSupply() public {
        Issuance.IssuanceParams memory p = _params();
        p.supply = 0;
        vm.expectRevert(Issuance.ZeroAmount.selector);
        new Issuance(p, issuer);
    }

    function test_createIssuance_revertsForZeroReservePrice() public {
        Issuance.IssuanceParams memory p = _params();
        p.reservePrice = 0;
        vm.expectRevert(Issuance.ZeroAmount.selector);
        new Issuance(p, issuer);
    }

    function test_createIssuance_revertsForZeroCapBps() public {
        Issuance.IssuanceParams memory p = _params();
        p.capBps = 0;
        vm.expectRevert(abi.encodeWithSelector(Issuance.InvalidCapBps.selector, uint16(0)));
        new Issuance(p, issuer);
    }

    function test_createIssuance_revertsForCapBpsOverOneHundredPercent() public {
        Issuance.IssuanceParams memory p = _params();
        p.capBps = 10_001;
        vm.expectRevert(abi.encodeWithSelector(Issuance.InvalidCapBps.selector, uint16(10_001)));
        new Issuance(p, issuer);
    }

    function test_createIssuance_revertsWhenComputedCapRoundsToZero() public {
        Issuance.IssuanceParams memory p = _params();
        p.supply = 10;
        p.capBps = 1;
        vm.expectRevert(Issuance.ZeroCap.selector);
        new Issuance(p, issuer);
    }

    function test_createIssuance_revertsForZeroMinHolders() public {
        Issuance.IssuanceParams memory p = _params();
        p.minHolders = 0;
        vm.expectRevert(Issuance.ZeroAmount.selector);
        new Issuance(p, issuer);
    }

    function test_createIssuance_revertsWhenMinHoldersExceedsSupply() public {
        Issuance.IssuanceParams memory p = _params();
        p.supply = 10;
        p.minHolders = 11;
        vm.expectRevert(abi.encodeWithSelector(Issuance.MinHoldersExceedsSupply.selector, uint32(11), uint256(10)));
        new Issuance(p, issuer);
    }

    function test_createIssuance_revertsForZeroPaymentToken() public {
        Issuance.IssuanceParams memory p = _params();
        p.paymentToken = address(0);
        vm.expectRevert(Issuance.ZeroAddress.selector);
        new Issuance(p, issuer);
    }

    function test_createIssuance_revertsForZeroSecurityToken() public {
        Issuance.IssuanceParams memory p = _params();
        p.securityToken = address(0);
        vm.expectRevert(Issuance.ZeroAddress.selector);
        new Issuance(p, issuer);
    }

    function test_createIssuance_revertsForNoApprovedAttestors() public {
        Issuance.IssuanceParams memory p = _params();
        p.approvedAttestors = new address[](0);
        vm.expectRevert(Issuance.NoApprovedAttestors.selector);
        new Issuance(p, issuer);
    }

    function test_createIssuance_revertsForTooManyApprovedAttestors() public {
        Issuance.IssuanceParams memory p = _params();
        address[] memory attestors = new address[](11);
        for (uint256 i = 0; i < attestors.length; i++) {
            attestors[i] = address(uint160(i + 1));
        }
        p.approvedAttestors = attestors;
        vm.expectRevert(abi.encodeWithSelector(Issuance.TooManyApprovedAttestors.selector, uint256(11)));
        new Issuance(p, issuer);
    }

    function test_createIssuance_revertsForZeroAddressAttestor() public {
        Issuance.IssuanceParams memory p = _params();
        address[] memory attestors = new address[](1);
        attestors[0] = address(0);
        p.approvedAttestors = attestors;
        vm.expectRevert(Issuance.ZeroAddress.selector);
        new Issuance(p, issuer);
    }

    function test_createIssuance_revertsForCommitWindowInPast() public {
        Issuance.IssuanceParams memory p = _params();
        p.commitWindowEnd = uint64(block.timestamp);
        vm.expectRevert(Issuance.CommitWindowNotInFuture.selector);
        new Issuance(p, issuer);
    }

    function test_createIssuance_revertsForRevealWindowNotAfterCommitWindow() public {
        Issuance.IssuanceParams memory p = _params();
        p.revealWindowEnd = p.commitWindowEnd;
        vm.expectRevert(Issuance.RevealWindowNotAfterCommitWindow.selector);
        new Issuance(p, issuer);
    }

    function test_createIssuance_revertsForZeroChallengeWindowLength() public {
        Issuance.IssuanceParams memory p = _params();
        p.challengeWindowLength = 0;
        vm.expectRevert(Issuance.ZeroChallengeWindowLength.selector);
        new Issuance(p, issuer);
    }
}
