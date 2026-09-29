// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {Issuance} from "../src/Issuance.sol";
import {FeeOnTransferMockERC20} from "./helpers/FeeOnTransferMockERC20.sol";

contract IssuanceNonConservativeTokenTest is Test {
    FeeOnTransferMockERC20 paymentToken;
    Issuance issuance;
    address securityToken = makeAddr("securityToken");
    address issuer = makeAddr("issuer");
    address attestor;
    uint256 attestorKey;

    uint64 commitWindowEnd;
    uint64 revealWindowEnd;
    uint64 challengeWindowLength = 1 hours;

    function setUp() public {
        paymentToken = new FeeOnTransferMockERC20(0);
        (attestor, attestorKey) = makeAddrAndKey("attestor");
    }

    function _buildParams(uint256 supply, uint256 reservePrice, uint16 capBps, uint32 minHolders)
        internal
        returns (Issuance.IssuanceParams memory p)
    {
        address[] memory attestors = new address[](1);
        attestors[0] = attestor;

        commitWindowEnd = uint64(block.timestamp + 1 days);
        revealWindowEnd = uint64(block.timestamp + 2 days);

        p = Issuance.IssuanceParams({
            supply: supply,
            reservePrice: reservePrice,
            capBps: capBps,
            minHolders: minHolders,
            minBond: 1,
            paymentToken: address(paymentToken),
            securityToken: securityToken,
            approvedAttestors: attestors,
            commitWindowEnd: commitWindowEnd,
            revealWindowEnd: revealWindowEnd,
            challengeWindowLength: challengeWindowLength
        });
    }

    function _deploy(uint256 supply, uint256 reservePrice, uint16 capBps, uint32 minHolders) internal {
        issuance = new Issuance(_buildParams(supply, reservePrice, capBps, minHolders), issuer);
    }

    function _fund(address who, uint256 amount) internal {
        paymentToken.mint(who, amount);
        vm.prank(who);
        paymentToken.approve(address(issuance), type(uint256).max);
    }

    function _commit(uint256 seed, uint256 qty, uint256 price) internal returns (address bidder) {
        bidder = vm.addr(seed);
        _fund(bidder, qty * price + 1_000_000);
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

    function _closeCommitWindow() internal {
        vm.warp(commitWindowEnd);
        issuance.closeCommitWindow();
    }

    function _closeRevealWindow() internal {
        vm.warp(revealWindowEnd);
        issuance.closeRevealWindow();
    }

    function test_commitBid_revertsForNonConservativeToken() public {
        _deploy(100, 1, 5_000, 1);
        paymentToken.setFeeBps(500);

        address bidder = vm.addr(1);
        _fund(bidder, 1_000_000);
        bytes32 commitment = keccak256(abi.encode(uint256(10), uint256(8), bytes32(uint256(1)), bidder));

        uint256 bond = 100;
        uint256 fee = (bond * 500) / 10_000;

        vm.prank(bidder);
        vm.expectRevert(abi.encodeWithSelector(Issuance.NonConservativeToken.selector, bond, bond - fee));
        issuance.commitBid(commitment, bond);
    }

    function test_revealBid_revertsForNonConservativeToken() public {
        _deploy(100, 1, 5_000, 1);
        address bidder = _commit(1, 10, 8);
        _closeCommitWindow();

        paymentToken.setFeeBps(500);

        uint64 expiry = revealWindowEnd;
        bytes32 digest = issuance.attestationDigest(bidder, expiry);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(attestorKey, digest);

        uint256 escrow = 10 * 8;
        uint256 fee = (escrow * 500) / 10_000;

        vm.prank(bidder);
        vm.expectRevert(abi.encodeWithSelector(Issuance.NonConservativeToken.selector, escrow, escrow - fee));
        issuance.revealBid(10, 8, bytes32(uint256(1)), expiry, abi.encodePacked(r, s, v));
    }

    function test_proposeClearing_revertsForNonConservativeToken() public {
        _deploy(100, 1, 5_000, 1);
        _commit(1, 10, 8);
        _closeCommitWindow();
        _reveal(1, 10, 8);
        _closeRevealWindow();

        uint256[] memory allocations = new uint256[](1);
        allocations[0] = 10;

        address proposer = vm.addr(2);
        _fund(proposer, 1_000_000);
        paymentToken.setFeeBps(500);

        uint256 bond = 100;
        uint256 fee = (bond * 500) / 10_000;

        vm.prank(proposer);
        vm.expectRevert(abi.encodeWithSelector(Issuance.NonConservativeToken.selector, bond, bond - fee));
        issuance.proposeClearing(8, allocations, bond);
    }

    function test_proposeUnresolvedClearing_revertsForNonConservativeToken() public {
        _deploy(100, 10, 5_000, 5);
        _commit(1, 20, 15);
        _closeCommitWindow();
        _reveal(1, 20, 15);
        _closeRevealWindow();

        address proposer = vm.addr(2);
        _fund(proposer, 1_000_000);
        paymentToken.setFeeBps(500);

        uint256 bond = 100;
        uint256 fee = (bond * 500) / 10_000;

        vm.prank(proposer);
        vm.expectRevert(abi.encodeWithSelector(Issuance.NonConservativeToken.selector, bond, bond - fee));
        issuance.proposeUnresolvedClearing(bond);
    }

    function test_challengeClearing_revertsForNonConservativeToken() public {
        _deploy(100, 1, 5_000, 2);
        _commit(1, 60, 10);
        _commit(2, 50, 8);
        _commit(3, 40, 5);
        _closeCommitWindow();
        _reveal(1, 60, 10);
        _reveal(2, 50, 8);
        _reveal(3, 40, 5);
        _closeRevealWindow();

        uint256[] memory allocations = new uint256[](3);
        allocations[0] = 50;
        allocations[1] = 50;
        allocations[2] = 0;

        address proposer = vm.addr(4);
        _fund(proposer, 1_000_000);
        vm.prank(proposer);
        issuance.proposeClearing(5, allocations, 10);

        address challenger = vm.addr(5);
        _fund(challenger, 1_000_000);
        paymentToken.setFeeBps(500);

        uint256 bond = 100;
        uint256 fee = (bond * 500) / 10_000;

        vm.prank(challenger);
        vm.expectRevert(abi.encodeWithSelector(Issuance.NonConservativeToken.selector, bond, bond - fee));
        issuance.challengeClearing(8, allocations, bond);
    }
}
