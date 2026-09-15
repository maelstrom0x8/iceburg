// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {Issuance} from "../src/Issuance.sol";
import {MockERC20} from "./helpers/MockERC20.sol";
import {IssuanceHarness} from "./helpers/IssuanceHarness.sol";

contract IssuanceProposeChallengeTest is Test {
    MockERC20 paymentToken;
    Issuance issuance;
    address securityToken = makeAddr("securityToken");
    address issuer = makeAddr("issuer");
    address attestor;
    uint256 attestorKey;

    uint64 commitWindowEnd;
    uint64 revealWindowEnd;
    uint64 challengeWindowLength = 1 hours;

    function setUp() public {
        paymentToken = new MockERC20();
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

    function _commit(uint256 seed, uint256 qty, uint256 price) internal {
        address bidder = vm.addr(seed);
        vm.label(bidder, string.concat("bidder", vm.toString(seed)));

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
        bytes memory sig = abi.encodePacked(r, s, v);

        vm.prank(bidder);
        issuance.revealBid(qty, price, bytes32(seed), expiry, sig);
    }

    function _openClearing() internal {
        vm.warp(commitWindowEnd);
        issuance.closeCommitWindow();
        vm.warp(revealWindowEnd);
        issuance.closeRevealWindow();
    }

    function _fundProposer(uint256 seed, uint256 bond) internal returns (address proposer) {
        proposer = vm.addr(seed);
        vm.label(proposer, string.concat("proposer", vm.toString(seed)));
        paymentToken.mint(proposer, bond);
        vm.prank(proposer);
        paymentToken.approve(address(issuance), type(uint256).max);
    }

    function _setUpCapPeelingScenario() internal {
        _deploy(100, 1, 5_000, 2);
        _commit(1, 60, 10);
        _commit(2, 50, 8);
        _commit(3, 40, 5);
        vm.warp(commitWindowEnd);
        issuance.closeCommitWindow();
        _reveal(1, 60, 10);
        _reveal(2, 50, 8);
        _reveal(3, 40, 5);
        vm.warp(revealWindowEnd);
        issuance.closeRevealWindow();
    }

    function _correctAllocations() internal pure returns (uint256[] memory a) {
        a = new uint256[](3);
        a[0] = 50;
        a[1] = 50;
        a[2] = 0;
    }

    function _suboptimalAllocations() internal pure returns (uint256[] memory a) {
        a = new uint256[](3);
        a[0] = 50;
        a[1] = 50;
        a[2] = 0;
    }

    function test_proposeClearing_success() public {
        _setUpCapPeelingScenario();
        address proposer = _fundProposer(100, 10);

        vm.prank(proposer);
        vm.expectEmit(true, false, false, true);
        emit Issuance.ClearingProposed(proposer, 8, 100, 10);
        issuance.proposeClearing(8, _correctAllocations(), 10);

        assertEq(uint256(issuance.state()), uint256(Issuance.State.CHALLENGE_OPEN));
        (uint256 price, uint256[] memory allocs, address recordedProposer, uint256 bond,, bool isUnresolved) =
            issuance.standingProposal();
        assertEq(price, 8);
        assertEq(allocs.length, 3);
        assertEq(recordedProposer, proposer);
        assertEq(bond, 10);
        assertFalse(isUnresolved);
        assertEq(paymentToken.balanceOf(address(issuance)), 1_200 + 10);
    }

    function test_proposeClearing_revertsForWrongState() public {
        _deploy(100, 1, 5_000, 2);
        address proposer = _fundProposer(100, 10);

        vm.prank(proposer);
        vm.expectRevert(
            abi.encodeWithSelector(
                Issuance.WrongState.selector, Issuance.State.CLEARING_PENDING, Issuance.State.COMMIT_OPEN
            )
        );
        issuance.proposeClearing(8, new uint256[](0), 10);
    }

    function test_proposeClearing_revertsForBondTooLow() public {
        _setUpCapPeelingScenario();
        address proposer = _fundProposer(100, 10);

        vm.prank(proposer);
        vm.expectRevert(abi.encodeWithSelector(Issuance.BondTooLow.selector, uint256(0), uint256(1)));
        issuance.proposeClearing(8, _correctAllocations(), 0);
    }

    function test_proposeClearing_revertsWhenInfeasible() public {
        _setUpCapPeelingScenario();
        address proposer = _fundProposer(100, 10);

        vm.prank(proposer);
        vm.expectRevert(abi.encodeWithSelector(Issuance.ReserveNotMet.selector, uint256(0), uint256(1)));
        issuance.proposeClearing(0, _correctAllocations(), 10);
    }

    function test_proposeUnresolvedClearing_success() public {
        _deploy(100, 10, 5_000, 5);
        _commit(1, 20, 15);
        _commit(2, 20, 12);
        vm.warp(commitWindowEnd);
        issuance.closeCommitWindow();
        _reveal(1, 20, 15);
        _reveal(2, 20, 12);
        vm.warp(revealWindowEnd);
        issuance.closeRevealWindow();

        address proposer = _fundProposer(100, 10);
        vm.prank(proposer);
        vm.expectEmit(true, false, false, true);
        emit Issuance.UnresolvedClaimProposed(proposer, 10);
        issuance.proposeUnresolvedClearing(10);

        assertEq(uint256(issuance.state()), uint256(Issuance.State.CHALLENGE_OPEN));
        (,, address recordedProposer,,, bool isUnresolved) = issuance.standingProposal();
        assertEq(recordedProposer, proposer);
        assertTrue(isUnresolved);
    }

    function test_proposeUnresolvedClearing_revertsWhenDiversityAchievable() public {
        _setUpCapPeelingScenario();
        address proposer = _fundProposer(100, 10);

        vm.prank(proposer);
        vm.expectRevert(abi.encodeWithSelector(Issuance.DiversityAchievable.selector, uint256(3), uint32(2)));
        issuance.proposeUnresolvedClearing(10);
    }

    function test_challengeClearing_beatsSuboptimalProposalWithHigherRevenue() public {
        _setUpCapPeelingScenario();
        address firstProposer = _fundProposer(100, 10);
        address challenger = _fundProposer(101, 10);

        vm.prank(firstProposer);
        issuance.proposeClearing(5, _suboptimalAllocations(), 10);

        uint256 firstProposerBalanceBefore = paymentToken.balanceOf(firstProposer);
        uint256 challengerBalanceBefore = paymentToken.balanceOf(challenger);

        vm.prank(challenger);
        vm.expectEmit(true, true, false, true);
        emit Issuance.ClearingChallenged(challenger, 8, 100, 10, firstProposer, 10);
        issuance.challengeClearing(8, _correctAllocations(), 10);

        (uint256 price,, address recordedProposer, uint256 bond,,) = issuance.standingProposal();
        assertEq(price, 8);
        assertEq(recordedProposer, challenger);
        assertEq(bond, 10);

        assertEq(paymentToken.balanceOf(firstProposer), firstProposerBalanceBefore);
        assertEq(paymentToken.balanceOf(challenger), challengerBalanceBefore - 10 + 10);
        assertEq(paymentToken.balanceOf(address(issuance)), 1_200 + 10);
    }

    function test_challengeClearing_revertsWhenNotBetter() public {
        _setUpCapPeelingScenario();
        address firstProposer = _fundProposer(100, 10);
        address challenger = _fundProposer(101, 10);

        vm.prank(firstProposer);
        issuance.proposeClearing(8, _correctAllocations(), 10);

        vm.prank(challenger);
        vm.expectRevert(Issuance.DoesNotBeatStanding.selector);
        issuance.challengeClearing(8, _correctAllocations(), 10);
    }

    function test_challengeClearing_revertsForWrongState() public {
        _setUpCapPeelingScenario();
        address challenger = _fundProposer(101, 10);

        vm.prank(challenger);
        vm.expectRevert(
            abi.encodeWithSelector(
                Issuance.WrongState.selector, Issuance.State.CHALLENGE_OPEN, Issuance.State.CLEARING_PENDING
            )
        );
        issuance.challengeClearing(8, _correctAllocations(), 10);
    }

    function test_challengeClearing_revertsAfterDeadline() public {
        _setUpCapPeelingScenario();
        address firstProposer = _fundProposer(100, 10);
        address challenger = _fundProposer(101, 10);

        vm.prank(firstProposer);
        issuance.proposeClearing(5, _suboptimalAllocations(), 10);

        vm.warp(block.timestamp + challengeWindowLength);

        vm.prank(challenger);
        vm.expectRevert(Issuance.ChallengeWindowElapsed.selector);
        issuance.challengeClearing(8, _correctAllocations(), 10);
    }

    function test_challengeClearing_revertsForBondTooLow() public {
        _setUpCapPeelingScenario();
        address firstProposer = _fundProposer(100, 10);
        address challenger = _fundProposer(101, 10);

        vm.prank(firstProposer);
        issuance.proposeClearing(5, _suboptimalAllocations(), 10);

        vm.prank(challenger);
        vm.expectRevert(abi.encodeWithSelector(Issuance.BondTooLow.selector, uint256(0), uint256(1)));
        issuance.challengeClearing(8, _correctAllocations(), 0);
    }

    function test_challengeClearing_revertsWhenInfeasible() public {
        _setUpCapPeelingScenario();
        address firstProposer = _fundProposer(100, 10);
        address challenger = _fundProposer(101, 10);

        vm.prank(firstProposer);
        issuance.proposeClearing(5, _suboptimalAllocations(), 10);

        vm.prank(challenger);
        vm.expectRevert(abi.encodeWithSelector(Issuance.ReserveNotMet.selector, uint256(0), uint256(1)));
        issuance.challengeClearing(0, _correctAllocations(), 10);
    }
}

contract IssuanceProposeChallengeHarnessTest is Test {
    MockERC20 paymentToken;
    IssuanceHarness issuance;
    address securityToken = makeAddr("securityToken");
    address issuer = makeAddr("issuer");
    address attestor;
    uint256 attestorKey;
    uint64 revealWindowEnd;

    function setUp() public {
        paymentToken = new MockERC20();
        (attestor, attestorKey) = makeAddrAndKey("attestor");

        address[] memory attestors = new address[](1);
        attestors[0] = attestor;

        uint64 commitWindowEnd = uint64(block.timestamp + 1 days);
        revealWindowEnd = uint64(block.timestamp + 2 days);

        Issuance.IssuanceParams memory p = Issuance.IssuanceParams({
            supply: 100,
            reservePrice: 1,
            capBps: 10_000,
            minHolders: 1,
            minBond: 1,
            paymentToken: address(paymentToken),
            securityToken: securityToken,
            approvedAttestors: attestors,
            commitWindowEnd: commitWindowEnd,
            revealWindowEnd: revealWindowEnd,
            challengeWindowLength: 1 hours
        });
        issuance = new IssuanceHarness(p, issuer);

        address bidder = vm.addr(1);
        paymentToken.mint(bidder, 1000);
        vm.prank(bidder);
        paymentToken.approve(address(issuance), type(uint256).max);
        vm.prank(bidder);
        issuance.commitBid(keccak256(abi.encode(uint256(60), uint256(10), bytes32(uint256(1)), bidder)), 1);

        vm.warp(commitWindowEnd);
        issuance.closeCommitWindow();

        uint64 expiry = revealWindowEnd;
        bytes32 digest = issuance.attestationDigest(bidder, expiry);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(attestorKey, digest);
        vm.prank(bidder);
        issuance.revealBid(60, 10, bytes32(uint256(1)), expiry, abi.encodePacked(r, s, v));

        vm.warp(revealWindowEnd);
        issuance.closeRevealWindow();
    }

    function test_challengeClearing_alwaysBeatsStandingUnresolvedClaim() public {
        address beatenProposer = makeAddr("beatenProposer");
        uint64 deadline = uint64(block.timestamp) + 1 hours;
        issuance.forceStandingUnresolvedClaim(beatenProposer, 5, deadline);

        address challenger = makeAddr("challenger");
        paymentToken.mint(challenger, 10);
        vm.prank(challenger);
        paymentToken.approve(address(issuance), type(uint256).max);

        uint256[] memory allocations = new uint256[](1);
        allocations[0] = 60;

        vm.prank(challenger);
        issuance.challengeClearing(10, allocations, 10);

        (uint256 price,, address recordedProposer,,, bool isUnresolved) = issuance.standingProposal();
        assertEq(price, 10);
        assertEq(recordedProposer, challenger);
        assertFalse(isUnresolved);
    }
}
