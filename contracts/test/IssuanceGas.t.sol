// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {Issuance} from "../src/Issuance.sol";
import {SecurityToken} from "../src/SecurityToken.sol";
import {MockERC20} from "./helpers/MockERC20.sol";

contract IssuanceGasTest is Test {
    MockERC20 paymentToken;
    SecurityToken securityToken;
    Issuance issuance;
    address issuer = makeAddr("issuer");
    address attestor;
    uint256 attestorKey;

    uint64 commitWindowEnd;
    uint64 revealWindowEnd;
    uint256 constant N = 64;
    uint256 constant QTY = 1_000;
    uint256 constant CAP = 64;

    function setUp() public {
        paymentToken = new MockERC20();
        securityToken = new SecurityToken("Max Bids Series", "MAXB", issuer);
        (attestor, attestorKey) = makeAddrAndKey("gas-attestor");

        address[] memory attestors = new address[](1);
        attestors[0] = attestor;

        commitWindowEnd = uint64(block.timestamp + 1 days);
        revealWindowEnd = uint64(block.timestamp + 2 days);

        Issuance.IssuanceParams memory p = Issuance.IssuanceParams({
            supply: 6_400,
            reservePrice: 1,
            capBps: 100,
            minHolders: 32,
            minBond: 1,
            paymentToken: address(paymentToken),
            securityToken: address(securityToken),
            approvedAttestors: attestors,
            commitWindowEnd: commitWindowEnd,
            revealWindowEnd: revealWindowEnd,
            challengeWindowLength: 1 hours
        });
        issuance = new Issuance(p, issuer);
        assertEq(issuance.cap(), CAP);

        vm.prank(issuer);
        securityToken.setMinter(address(issuance));

        for (uint256 i = 1; i <= N; i++) {
            _commit(i, QTY, i);
        }
        vm.warp(commitWindowEnd);
        issuance.closeCommitWindow();
        for (uint256 i = 1; i <= N; i++) {
            _reveal(i, QTY, i);
        }
        vm.warp(revealWindowEnd);
        issuance.closeRevealWindow();
    }

    function _commit(uint256 seed, uint256 qty, uint256 price) internal {
        address bidder = vm.addr(seed);
        uint256 escrow = qty * price;
        paymentToken.mint(bidder, escrow + 1_000);
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

    function _allocationsAtOrAbove(uint256 priceThreshold) internal view returns (uint256[] memory allocations) {
        allocations = new uint256[](N);
        for (uint256 i = 0; i < N; i++) {
            Issuance.Bid memory b = issuance.bidAt(i);
            allocations[i] = b.price >= priceThreshold ? CAP : 0;
        }
    }

    function test_gas_atMaxBids() public {
        address proposer = makeAddr("gas-proposer");
        paymentToken.mint(proposer, 1_000);
        vm.prank(proposer);
        paymentToken.approve(address(issuance), type(uint256).max);

        uint256[] memory firstAllocations = _allocationsAtOrAbove(1);
        vm.prank(proposer);
        issuance.proposeClearing(1, firstAllocations, 1);

        address challenger = makeAddr("gas-challenger");
        paymentToken.mint(challenger, 1_000);
        vm.prank(challenger);
        paymentToken.approve(address(issuance), type(uint256).max);

        uint256[] memory secondAllocations = _allocationsAtOrAbove(2);
        vm.prank(challenger);
        issuance.challengeClearing(2, secondAllocations, 1);

        vm.warp(block.timestamp + 1 hours);
        issuance.closeChallengeWindow();
        issuance.settle();

        assertEq(uint256(issuance.state()), uint256(Issuance.State.SETTLED));
        assertTrue(issuance.finalized());
    }
}
