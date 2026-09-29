// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {Issuance} from "../src/Issuance.sol";
import {MockERC20} from "./helpers/MockERC20.sol";

contract PoC_VerifyClearingFairnessTest is Test {
    MockERC20 paymentToken;
    Issuance issuance;
    address securityToken = makeAddr("securityToken");
    address issuer = makeAddr("issuer");
    address attestor;
    uint256 attestorKey;

    uint64 commitWindowEnd;
    uint64 revealWindowEnd;

    function setUp() public {
        paymentToken = new MockERC20();
        (attestor, attestorKey) = makeAddrAndKey("attestor");

        address[] memory attestors = new address[](1);
        attestors[0] = attestor;
        commitWindowEnd = uint64(block.timestamp + 1 days);
        revealWindowEnd = uint64(block.timestamp + 2 days);

        Issuance.IssuanceParams memory p = Issuance.IssuanceParams({
            supply: 200,
            reservePrice: 1,
            capBps: 5_000,
            minHolders: 2,
            minBond: 1,
            paymentToken: address(paymentToken),
            securityToken: securityToken,
            approvedAttestors: attestors,
            commitWindowEnd: commitWindowEnd,
            revealWindowEnd: revealWindowEnd,
            challengeWindowLength: 1 hours
        });
        issuance = new Issuance(p, issuer);

        _commit(1, 200, 10);
        _commit(2, 200, 10);
        _commit(3, 200, 10);

        vm.warp(commitWindowEnd);
        issuance.closeCommitWindow();

        _reveal(1, 200, 10);
        _reveal(2, 200, 10);
        _reveal(3, 200, 10);
    }

    function _commit(uint256 seed, uint256 qty, uint256 price) internal {
        address bidder = vm.addr(seed);
        uint256 escrow = qty * price;
        paymentToken.mint(bidder, escrow + 1_000_000);
        vm.prank(bidder);
        paymentToken.approve(address(issuance), type(uint256).max);
        bytes32 commitment = keccak256(abi.encode(qty, price, bytes32(seed), bidder));
        vm.prank(bidder);
        issuance.commitBid(commitment, 1);
    }

    function _reveal(uint256 seed, uint256 qty, uint256 price) internal {
        address bidder = vm.addr(seed);
        uint64 expiry = revealWindowEnd;
        bytes32 digest = issuance.attestationDigest(bidder, expiry);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(attestorKey, digest);
        vm.prank(bidder);
        issuance.revealBid(qty, price, bytes32(seed), expiry, abi.encodePacked(r, s, v));
    }

    function test_fairAllocation_50_50_50_isAccepted() public view {
        uint256[] memory fair = new uint256[](3);
        fair[0] = 50;
        fair[1] = 50;
        fair[2] = 50;

        (uint256 totalAllocated,,) = issuance.verifyClearing(10, fair);
        assertEq(totalAllocated, 150);
    }

    function test_skewedAllocation_100_25_25_isRejected() public {
        uint256[] memory skewed = new uint256[](3);
        skewed[0] = 100;
        skewed[1] = 25;
        skewed[2] = 25;

        vm.expectRevert(abi.encodeWithSelector(Issuance.SamePriceTierSplit.selector, 0, 1));
        issuance.verifyClearing(10, skewed);
    }

    function test_skewedAllocation_twoSatisfiedOneRationed_isRejected() public {
        uint256[] memory skewed = new uint256[](3);
        skewed[0] = 100;
        skewed[1] = 100;
        skewed[2] = 0;

        vm.expectRevert(abi.encodeWithSelector(Issuance.SamePriceTierSplit.selector, 0, 2));
        issuance.verifyClearing(10, skewed);
    }

    function test_fairAllocation_proposesAndSettlesCleanly() public {
        uint256[] memory fair = new uint256[](3);
        fair[0] = 50;
        fair[1] = 50;
        fair[2] = 50;

        vm.warp(revealWindowEnd);
        issuance.closeRevealWindow();

        address proposer = vm.addr(100);
        paymentToken.mint(proposer, 10);
        vm.prank(proposer);
        paymentToken.approve(address(issuance), type(uint256).max);
        vm.prank(proposer);
        issuance.proposeClearing(10, fair, 10);

        vm.warp(block.timestamp + 1 hours);
        issuance.closeChallengeWindow();
        assertEq(uint256(issuance.state()), uint256(Issuance.State.SETTLED));
    }
}
