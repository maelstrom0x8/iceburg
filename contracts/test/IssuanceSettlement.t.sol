// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {Issuance} from "../src/Issuance.sol";
import {SecurityToken} from "../src/SecurityToken.sol";
import {MockERC20} from "./helpers/MockERC20.sol";
import {FreezableMockERC20} from "./helpers/FreezableMockERC20.sol";

contract IssuanceSettlementTest is Test {
    MockERC20 paymentToken;
    SecurityToken securityToken;
    Issuance issuance;
    address issuer = makeAddr("issuer");
    address attestor;
    uint256 attestorKey;

    uint64 commitWindowEnd;
    uint64 revealWindowEnd;
    uint64 challengeWindowLength = 1 hours;

    function setUp() public {
        paymentToken = new MockERC20();
        securityToken = new SecurityToken("Series A Preferred", "SERA", issuer);
        (attestor, attestorKey) = makeAddrAndKey("attestor");
    }

    function _deploy(uint256 supply, uint256 reservePrice, uint16 capBps, uint32 minHolders) internal {
        address[] memory attestors = new address[](1);
        attestors[0] = attestor;

        commitWindowEnd = uint64(block.timestamp + 1 days);
        revealWindowEnd = uint64(block.timestamp + 2 days);

        Issuance.IssuanceParams memory p = Issuance.IssuanceParams({
            supply: supply,
            reservePrice: reservePrice,
            capBps: capBps,
            minHolders: minHolders,
            minBond: 1,
            paymentToken: address(paymentToken),
            securityToken: address(securityToken),
            approvedAttestors: attestors,
            commitWindowEnd: commitWindowEnd,
            revealWindowEnd: revealWindowEnd,
            challengeWindowLength: challengeWindowLength
        });
        issuance = new Issuance(p, issuer);

        vm.prank(issuer);
        securityToken.setMinter(address(issuance));
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

    function _fundProposer(uint256 seed, uint256 bond) internal returns (address proposer) {
        proposer = vm.addr(seed);
        vm.label(proposer, string.concat("proposer", vm.toString(seed)));
        paymentToken.mint(proposer, bond);
        vm.prank(proposer);
        paymentToken.approve(address(issuance), type(uint256).max);
    }

    function _capPeelingAllocations() internal pure returns (uint256[] memory a) {
        a = new uint256[](3);
        a[0] = 50;
        a[1] = 50;
        a[2] = 0;
    }

    function _setUpToChallengeOpenWithCorrectClearing() internal returns (address proposer) {
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

        proposer = _fundProposer(100, 10);
        vm.prank(proposer);
        issuance.proposeClearing(8, _capPeelingAllocations(), 10);
    }

    function test_closeChallengeWindow_revertsWhenStillOpen() public {
        _setUpToChallengeOpenWithCorrectClearing();
        vm.expectRevert(Issuance.ChallengeWindowStillOpen.selector);
        issuance.closeChallengeWindow();
    }

    function test_closeChallengeWindow_revertsForWrongState() public {
        _deploy(100, 1, 5_000, 2);
        vm.expectRevert(
            abi.encodeWithSelector(
                Issuance.WrongState.selector, Issuance.State.CHALLENGE_OPEN, Issuance.State.COMMIT_OPEN
            )
        );
        issuance.closeChallengeWindow();
    }

    function test_closeChallengeWindow_transitionsToSettled() public {
        _setUpToChallengeOpenWithCorrectClearing();
        vm.warp(block.timestamp + challengeWindowLength);

        vm.expectEmit(false, false, false, true);
        emit Issuance.ChallengeWindowClosed(Issuance.State.SETTLED);
        issuance.closeChallengeWindow();

        assertEq(uint256(issuance.state()), uint256(Issuance.State.SETTLED));
    }

    function test_settle_mintsAndPaysCorrectly() public {
        address proposer = _setUpToChallengeOpenWithCorrectClearing();
        vm.warp(block.timestamp + challengeWindowLength);
        issuance.closeChallengeWindow();

        address bidder1 = vm.addr(1);
        address bidder2 = vm.addr(2);
        address bidder3 = vm.addr(3);

        uint256 bidder1BalanceBefore = paymentToken.balanceOf(bidder1);
        uint256 bidder2BalanceBefore = paymentToken.balanceOf(bidder2);
        uint256 bidder3BalanceBefore = paymentToken.balanceOf(bidder3);
        uint256 proposerBalanceBefore = paymentToken.balanceOf(proposer);
        uint256 issuerBalanceBefore = paymentToken.balanceOf(issuer);

        vm.expectEmit(true, false, false, true);
        emit Issuance.WinnerSettled(bidder1, 50, 400, 200);
        issuance.settle();

        assertEq(securityToken.balanceOf(bidder1), 50);
        assertEq(securityToken.balanceOf(bidder2), 50);
        assertEq(securityToken.balanceOf(bidder3), 0);
        assertEq(securityToken.totalSupply(), 100);

        assertEq(paymentToken.balanceOf(bidder1), bidder1BalanceBefore);
        assertEq(issuance.claimable(bidder1), 200);
        assertEq(issuance.claimable(bidder2), 0);
        assertEq(issuance.claimable(bidder3), 200);
        assertEq(issuance.claimable(issuer), 400 + 400);
        assertEq(issuance.claimable(proposer), 10);
        assertEq(paymentToken.balanceOf(address(issuance)), 1_200 + 10);

        vm.prank(bidder1);
        issuance.claim();
        vm.prank(bidder3);
        issuance.claim();
        vm.prank(issuer);
        issuance.claim();
        vm.prank(proposer);
        issuance.claim();

        assertEq(paymentToken.balanceOf(bidder1), bidder1BalanceBefore + 200);
        assertEq(paymentToken.balanceOf(bidder2), bidder2BalanceBefore + 0);
        assertEq(paymentToken.balanceOf(bidder3), bidder3BalanceBefore + 200);
        assertEq(paymentToken.balanceOf(issuer), issuerBalanceBefore + 400 + 400);
        assertEq(paymentToken.balanceOf(proposer), proposerBalanceBefore + 10);

        assertEq(paymentToken.balanceOf(address(issuance)), 0);
    }

    function test_claim_revertsWithNothingToClaim() public {
        _setUpToChallengeOpenWithCorrectClearing();
        vm.warp(block.timestamp + challengeWindowLength);
        issuance.closeChallengeWindow();
        issuance.settle();

        address bidder2 = vm.addr(2);
        vm.prank(bidder2);
        vm.expectRevert(Issuance.NothingToClaim.selector);
        issuance.claim();
    }

    function test_claim_isIndependentPerAccount_secondClaimIsNoop() public {
        address proposer = _setUpToChallengeOpenWithCorrectClearing();
        vm.warp(block.timestamp + challengeWindowLength);
        issuance.closeChallengeWindow();
        issuance.settle();

        address bidder1 = vm.addr(1);
        vm.prank(bidder1);
        issuance.claim();
        assertEq(issuance.claimable(bidder1), 0);

        vm.prank(bidder1);
        vm.expectRevert(Issuance.NothingToClaim.selector);
        issuance.claim();

        assertEq(issuance.claimable(vm.addr(3)), 200);
        assertEq(issuance.claimable(proposer), 10);
    }

    function test_settle_oneFrozenBidderDoesNotBlockSettlementOrOthersClaims() public {
        FreezableMockERC20 freezable = new FreezableMockERC20();
        securityToken = new SecurityToken("Series A Preferred", "SERA", issuer);

        address[] memory attestors = new address[](1);
        attestors[0] = attestor;
        commitWindowEnd = uint64(block.timestamp + 1 days);
        revealWindowEnd = uint64(block.timestamp + 2 days);

        Issuance.IssuanceParams memory p = Issuance.IssuanceParams({
            supply: 100,
            reservePrice: 1,
            capBps: 5_000,
            minHolders: 2,
            minBond: 1,
            paymentToken: address(freezable),
            securityToken: address(securityToken),
            approvedAttestors: attestors,
            commitWindowEnd: commitWindowEnd,
            revealWindowEnd: revealWindowEnd,
            challengeWindowLength: challengeWindowLength
        });
        issuance = new Issuance(p, issuer);
        vm.prank(issuer);
        securityToken.setMinter(address(issuance));

        address bidder1 = vm.addr(1);
        address bidder2 = vm.addr(2);
        address bidder3 = vm.addr(3);
        freezable.mint(bidder1, 10_000_000);
        freezable.mint(bidder2, 10_000_000);
        freezable.mint(bidder3, 10_000_000);
        vm.prank(bidder1);
        freezable.approve(address(issuance), type(uint256).max);
        vm.prank(bidder2);
        freezable.approve(address(issuance), type(uint256).max);
        vm.prank(bidder3);
        freezable.approve(address(issuance), type(uint256).max);

        vm.prank(bidder1);
        issuance.commitBid(keccak256(abi.encode(uint256(60), uint256(10), bytes32(uint256(1)), bidder1)), 1);
        vm.prank(bidder2);
        issuance.commitBid(keccak256(abi.encode(uint256(50), uint256(8), bytes32(uint256(2)), bidder2)), 1);
        vm.prank(bidder3);
        issuance.commitBid(keccak256(abi.encode(uint256(40), uint256(5), bytes32(uint256(3)), bidder3)), 1);
        vm.warp(commitWindowEnd);
        issuance.closeCommitWindow();

        _reveal(1, 60, 10);
        _reveal(2, 50, 8);
        _reveal(3, 40, 5);
        vm.warp(revealWindowEnd);
        issuance.closeRevealWindow();

        freezable.setFrozen(bidder3, true);

        freezable.mint(address(this), 10);
        freezable.approve(address(issuance), type(uint256).max);
        issuance.proposeClearing(8, _capPeelingAllocations(), 10);

        vm.warp(block.timestamp + challengeWindowLength);
        issuance.closeChallengeWindow();

        issuance.settle();

        assertEq(issuance.claimable(bidder1), 200);
        assertEq(issuance.claimable(bidder3), 200);

        vm.prank(bidder1);
        issuance.claim();
        assertEq(freezable.balanceOf(bidder1), 10_000_000 - 600 + 200);

        vm.prank(bidder3);
        vm.expectRevert(abi.encodeWithSelector(FreezableMockERC20.AccountFrozen.selector, bidder3));
        issuance.claim();
        assertEq(issuance.claimable(bidder3), 200);
    }

    function test_settle_revertsForWrongState() public {
        _setUpToChallengeOpenWithCorrectClearing();
        vm.expectRevert(
            abi.encodeWithSelector(Issuance.WrongState.selector, Issuance.State.SETTLED, Issuance.State.CHALLENGE_OPEN)
        );
        issuance.settle();
    }

    function test_settle_revertsWhenCalledTwice() public {
        _setUpToChallengeOpenWithCorrectClearing();
        vm.warp(block.timestamp + challengeWindowLength);
        issuance.closeChallengeWindow();
        issuance.settle();

        vm.expectRevert(Issuance.AlreadyFinalized.selector);
        issuance.settle();
    }

    function test_settle_isSafeToCallConcurrentlyFromMultipleCallers() public {
        _setUpToChallengeOpenWithCorrectClearing();
        vm.warp(block.timestamp + challengeWindowLength);
        issuance.closeChallengeWindow();

        issuance.settle();

        vm.prank(makeAddr("randomCaller"));
        vm.expectRevert(Issuance.AlreadyFinalized.selector);
        issuance.settle();

        assertEq(securityToken.totalSupply(), 100);
    }

    function test_cancelUnresolved_refundsEveryoneNoMint() public {
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
        issuance.proposeUnresolvedClearing(10);

        vm.warp(block.timestamp + challengeWindowLength);
        issuance.closeChallengeWindow();
        assertEq(uint256(issuance.state()), uint256(Issuance.State.CANCELLED));

        address bidder1 = vm.addr(1);
        address bidder2 = vm.addr(2);
        uint256 bidder1BalanceBefore = paymentToken.balanceOf(bidder1);
        uint256 bidder2BalanceBefore = paymentToken.balanceOf(bidder2);
        uint256 proposerBalanceBefore = paymentToken.balanceOf(proposer);

        vm.expectEmit(true, false, false, true);
        emit Issuance.Cancelled(proposer);
        issuance.cancelUnresolved();

        assertEq(paymentToken.balanceOf(bidder1), bidder1BalanceBefore);
        assertEq(issuance.claimable(bidder1), 20 * 15);
        assertEq(issuance.claimable(bidder2), 20 * 12);
        assertEq(issuance.claimable(proposer), 10);

        vm.prank(bidder1);
        issuance.claim();
        vm.prank(bidder2);
        issuance.claim();
        vm.prank(proposer);
        issuance.claim();

        assertEq(paymentToken.balanceOf(bidder1), bidder1BalanceBefore + 20 * 15);
        assertEq(paymentToken.balanceOf(bidder2), bidder2BalanceBefore + 20 * 12);
        assertEq(paymentToken.balanceOf(proposer), proposerBalanceBefore + 10);
        assertEq(securityToken.totalSupply(), 0);
        assertEq(paymentToken.balanceOf(address(issuance)), 0);
    }

    function test_cancelUnresolved_revertsForWrongState() public {
        _setUpToChallengeOpenWithCorrectClearing();
        vm.expectRevert(
            abi.encodeWithSelector(
                Issuance.WrongState.selector, Issuance.State.CANCELLED, Issuance.State.CHALLENGE_OPEN
            )
        );
        issuance.cancelUnresolved();
    }

    function test_cancelStalledClearing_revertsForWrongState() public {
        _deploy(100, 1, 5_000, 2);
        vm.expectRevert(
            abi.encodeWithSelector(
                Issuance.WrongState.selector, Issuance.State.CLEARING_PENDING, Issuance.State.COMMIT_OPEN
            )
        );
        issuance.cancelStalledClearing();
    }

    function test_cancelStalledClearing_revertsBeforeTimeoutElapses() public {
        _deploy(100, 1, 5_000, 2);
        _commit(1, 60, 10);
        vm.warp(commitWindowEnd);
        issuance.closeCommitWindow();
        _reveal(1, 60, 10);
        vm.warp(revealWindowEnd);
        issuance.closeRevealWindow();

        vm.expectRevert(Issuance.ClearingPendingStillOpen.selector);
        issuance.cancelStalledClearing();

        vm.warp(revealWindowEnd + issuance.CLEARING_PENDING_TIMEOUT() - 1);
        vm.expectRevert(Issuance.ClearingPendingStillOpen.selector);
        issuance.cancelStalledClearing();
    }

    function test_cancelStalledClearing_doesNotBlockAProposalMadeInTime() public {
        _setUpToChallengeOpenWithCorrectClearing();
        vm.expectRevert(
            abi.encodeWithSelector(
                Issuance.WrongState.selector, Issuance.State.CLEARING_PENDING, Issuance.State.CHALLENGE_OPEN
            )
        );
        issuance.cancelStalledClearing();
    }

    function test_cancelStalledClearing_thenCancelUnresolvedRefundsEveryoneNoMint() public {
        _deploy(100, 10, 5_000, 5);
        _commit(1, 20, 15);
        _commit(2, 20, 12);
        vm.warp(commitWindowEnd);
        issuance.closeCommitWindow();
        _reveal(1, 20, 15);
        _reveal(2, 20, 12);
        vm.warp(revealWindowEnd);
        issuance.closeRevealWindow();

        vm.warp(revealWindowEnd + issuance.CLEARING_PENDING_TIMEOUT());

        vm.expectEmit(false, false, false, true);
        emit Issuance.ClearingPendingTimedOut();
        issuance.cancelStalledClearing();
        assertEq(uint256(issuance.state()), uint256(Issuance.State.CANCELLED));

        address bidder1 = vm.addr(1);
        address bidder2 = vm.addr(2);
        uint256 bidder1BalanceBefore = paymentToken.balanceOf(bidder1);
        uint256 bidder2BalanceBefore = paymentToken.balanceOf(bidder2);

        vm.expectEmit(true, false, false, true);
        emit Issuance.Cancelled(address(0));
        issuance.cancelUnresolved();

        assertEq(issuance.claimable(bidder1), 20 * 15);
        assertEq(issuance.claimable(bidder2), 20 * 12);

        vm.prank(bidder1);
        issuance.claim();
        vm.prank(bidder2);
        issuance.claim();

        assertEq(paymentToken.balanceOf(bidder1), bidder1BalanceBefore + 20 * 15);
        assertEq(paymentToken.balanceOf(bidder2), bidder2BalanceBefore + 20 * 12);
        assertEq(securityToken.totalSupply(), 0);
        assertEq(paymentToken.balanceOf(address(issuance)), 0);
    }

    function test_cancelUnresolved_revertsWhenCalledTwice() public {
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
        issuance.proposeUnresolvedClearing(10);

        vm.warp(block.timestamp + challengeWindowLength);
        issuance.closeChallengeWindow();
        issuance.cancelUnresolved();

        vm.expectRevert(Issuance.AlreadyFinalized.selector);
        issuance.cancelUnresolved();
    }
}
