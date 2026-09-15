// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {Issuance} from "../src/Issuance.sol";
import {MockERC20} from "./helpers/MockERC20.sol";
import {IssuanceParamsBuilder} from "./helpers/IssuanceParamsBuilder.sol";

contract IssuanceCommitRevealTest is Test {
    MockERC20 paymentToken;
    Issuance issuance;
    address securityToken = makeAddr("securityToken");
    address issuer = makeAddr("issuer");

    address attestor;
    uint256 attestorKey;

    address bidder = makeAddr("bidder");
    uint256 minBond;
    uint64 commitWindowEnd;
    uint64 revealWindowEnd;

    function setUp() public {
        paymentToken = new MockERC20();
        (attestor, attestorKey) = makeAddrAndKey("attestor");

        Issuance.IssuanceParams memory p =
            IssuanceParamsBuilder.defaults(address(paymentToken), securityToken, attestor);
        issuance = new Issuance(p, issuer);
        minBond = p.minBond;
        commitWindowEnd = p.commitWindowEnd;
        revealWindowEnd = p.revealWindowEnd;

        paymentToken.mint(bidder, 1_000_000e18);
        vm.prank(bidder);
        paymentToken.approve(address(issuance), type(uint256).max);
    }

    function _commitment(uint256 qty, uint256 price, bytes32 salt, address who) internal pure returns (bytes32) {
        return keccak256(abi.encode(qty, price, salt, who));
    }

    function _sign(uint256 key, bytes32 digest) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);
        return abi.encodePacked(r, s, v);
    }

    function _validAttestation(address who, uint64 expiry) internal view returns (bytes memory) {
        bytes32 digest = issuance.attestationDigest(who, expiry);
        return _sign(attestorKey, digest);
    }

    function test_commitBid() public {
        bytes32 commitment = _commitment(100, 8e6, bytes32(uint256(1)), bidder);

        vm.prank(bidder);
        vm.expectEmit(true, false, false, true);
        emit Issuance.BidCommitted(bidder, commitment, minBond);
        issuance.commitBid(commitment, minBond);

        assertEq(issuance.commitmentOf(bidder), commitment);
        assertEq(issuance.commitBondOf(bidder), minBond);
        assertEq(issuance.committedCount(), 1);
        assertEq(paymentToken.balanceOf(address(issuance)), minBond);
    }

    function test_commitBid_revertsAfterWindowElapses() public {
        vm.warp(commitWindowEnd);
        vm.prank(bidder);
        vm.expectRevert(Issuance.CommitWindowElapsed.selector);
        issuance.commitBid(_commitment(1, 1, bytes32(0), bidder), minBond);
    }

    function test_commitBid_revertsForEmptyCommitment() public {
        vm.prank(bidder);
        vm.expectRevert(Issuance.EmptyCommitment.selector);
        issuance.commitBid(bytes32(0), minBond);
    }

    function test_commitBid_revertsForLowBond() public {
        vm.prank(bidder);
        vm.expectRevert(abi.encodeWithSelector(Issuance.BondTooLow.selector, minBond - 1, minBond));
        issuance.commitBid(_commitment(1, 1, bytes32(0), bidder), minBond - 1);
    }

    function test_commitBid_revertsIfAlreadyCommitted() public {
        vm.startPrank(bidder);
        issuance.commitBid(_commitment(1, 1, bytes32(0), bidder), minBond);
        vm.expectRevert(Issuance.AlreadyCommitted.selector);
        issuance.commitBid(_commitment(2, 2, bytes32(0), bidder), minBond);
        vm.stopPrank();
    }

    function test_commitBid_revertsAtMaxBids() public {
        for (uint256 i = 0; i < issuance.MAX_BIDS(); i++) {
            address committer = address(uint160(i + 1000));
            paymentToken.mint(committer, minBond);
            vm.prank(committer);
            paymentToken.approve(address(issuance), minBond);
            vm.prank(committer);
            issuance.commitBid(_commitment(1, 1, bytes32(0), committer), minBond);
        }

        vm.prank(bidder);
        vm.expectRevert(Issuance.MaxBidsReached.selector);
        issuance.commitBid(_commitment(1, 1, bytes32(0), bidder), minBond);
    }

    function test_closeCommitWindow() public {
        vm.warp(commitWindowEnd);
        vm.expectEmit(false, false, false, false);
        emit Issuance.CommitWindowClosed();
        issuance.closeCommitWindow();

        assertEq(uint256(issuance.state()), uint256(Issuance.State.REVEAL_OPEN));
    }

    function test_closeCommitWindow_revertsIfStillOpen() public {
        vm.expectRevert(Issuance.CommitWindowStillOpen.selector);
        issuance.closeCommitWindow();
    }

    function test_closeCommitWindow_revertsIfWrongState() public {
        vm.warp(commitWindowEnd);
        issuance.closeCommitWindow();
        vm.expectRevert(
            abi.encodeWithSelector(Issuance.WrongState.selector, Issuance.State.COMMIT_OPEN, Issuance.State.REVEAL_OPEN)
        );
        issuance.closeCommitWindow();
    }

    function _commitAndOpenReveal(uint256 qty, uint256 price, bytes32 salt) internal {
        vm.prank(bidder);
        issuance.commitBid(_commitment(qty, price, salt, bidder), minBond);
        vm.warp(commitWindowEnd);
        issuance.closeCommitWindow();
    }

    function test_revealBid() public {
        uint256 qty = 100;
        uint256 price = 8e6;
        bytes32 salt = bytes32(uint256(42));
        _commitAndOpenReveal(qty, price, salt);

        uint64 expiry = revealWindowEnd;
        bytes memory sig = _validAttestation(bidder, expiry);

        uint256 bidderBalanceBefore = paymentToken.balanceOf(bidder);

        vm.prank(bidder);
        vm.expectEmit(true, false, false, true);
        emit Issuance.BidRevealed(bidder, qty, price);
        issuance.revealBid(qty, price, salt, expiry, sig);

        assertEq(issuance.bidCount(), 1);
        Issuance.Bid memory bid = issuance.bidAt(0);
        assertEq(bid.bidder, bidder);
        assertEq(bid.qty, qty);
        assertEq(bid.price, price);
        assertTrue(bid.eligible);
        assertEq(bid.escrow, qty * price);

        assertEq(issuance.commitmentOf(bidder), bytes32(0));
        assertEq(issuance.commitBondOf(bidder), 0);
        assertEq(paymentToken.balanceOf(bidder), bidderBalanceBefore - (qty * price) + minBond);
    }

    function test_revealBid_revertsForWrongState() public {
        vm.prank(bidder);
        issuance.commitBid(_commitment(1, 1, bytes32(0), bidder), minBond);

        vm.prank(bidder);
        vm.expectRevert(
            abi.encodeWithSelector(Issuance.WrongState.selector, Issuance.State.REVEAL_OPEN, Issuance.State.COMMIT_OPEN)
        );
        issuance.revealBid(1, 1, bytes32(0), revealWindowEnd, "");
    }

    function test_revealBid_revertsAfterWindowElapses() public {
        _commitAndOpenReveal(1, 1, bytes32(0));
        vm.warp(revealWindowEnd);

        vm.prank(bidder);
        vm.expectRevert(Issuance.RevealWindowElapsed.selector);
        issuance.revealBid(1, 1, bytes32(0), revealWindowEnd, "");
    }

    function test_revealBid_revertsForNoCommitment() public {
        vm.warp(commitWindowEnd);
        issuance.closeCommitWindow();

        vm.prank(bidder);
        vm.expectRevert(Issuance.NoCommitment.selector);
        issuance.revealBid(1, 1, bytes32(0), revealWindowEnd, "");
    }

    function test_revealBid_revertsForCommitmentMismatch() public {
        _commitAndOpenReveal(100, 8e6, bytes32(uint256(42)));

        bytes memory sig = _validAttestation(bidder, revealWindowEnd);
        vm.prank(bidder);
        vm.expectRevert(Issuance.CommitmentMismatch.selector);
        issuance.revealBid(999, 8e6, bytes32(uint256(42)), revealWindowEnd, sig);
    }

    function test_revealBid_revertsForExpiredAttestation() public {
        uint256 qty = 100;
        uint256 price = 8e6;
        bytes32 salt = bytes32(uint256(42));
        _commitAndOpenReveal(qty, price, salt);

        uint64 expiry = uint64(block.timestamp);
        bytes memory sig = _validAttestation(bidder, expiry);
        vm.warp(expiry + 1);

        vm.prank(bidder);
        vm.expectRevert(Issuance.InvalidAttestation.selector);
        issuance.revealBid(qty, price, salt, expiry, sig);
    }

    function test_revealBid_revertsForUnapprovedAttestor() public {
        uint256 qty = 100;
        uint256 price = 8e6;
        bytes32 salt = bytes32(uint256(42));
        _commitAndOpenReveal(qty, price, salt);

        (, uint256 rogueKey) = makeAddrAndKey("rogueAttestor");
        uint64 expiry = revealWindowEnd;
        bytes32 digest = issuance.attestationDigest(bidder, expiry);
        bytes memory sig = _sign(rogueKey, digest);

        vm.prank(bidder);
        vm.expectRevert(Issuance.InvalidAttestation.selector);
        issuance.revealBid(qty, price, salt, expiry, sig);
    }

    function test_revealBid_revertsForAttestationSignedForDifferentBidder() public {
        uint256 qty = 100;
        uint256 price = 8e6;
        bytes32 salt = bytes32(uint256(42));
        _commitAndOpenReveal(qty, price, salt);

        uint64 expiry = revealWindowEnd;
        bytes memory sig = _validAttestation(makeAddr("someoneElse"), expiry);

        vm.prank(bidder);
        vm.expectRevert(Issuance.InvalidAttestation.selector);
        issuance.revealBid(qty, price, salt, expiry, sig);
    }

    function test_closeRevealWindow_forfeitsUnrevealedBonds() public {
        address noShow = makeAddr("noShow");
        paymentToken.mint(noShow, minBond);
        vm.prank(noShow);
        paymentToken.approve(address(issuance), minBond);
        vm.prank(noShow);
        issuance.commitBid(_commitment(1, 1, bytes32(0), noShow), minBond);

        uint256 qty = 100;
        uint256 price = 8e6;
        bytes32 salt = bytes32(uint256(42));
        vm.prank(bidder);
        issuance.commitBid(_commitment(qty, price, salt, bidder), minBond);

        vm.warp(commitWindowEnd);
        issuance.closeCommitWindow();

        bytes memory sig = _validAttestation(bidder, revealWindowEnd);
        vm.prank(bidder);
        issuance.revealBid(qty, price, salt, revealWindowEnd, sig);

        uint256 issuerBalanceBefore = paymentToken.balanceOf(issuer);

        vm.warp(revealWindowEnd);
        vm.expectEmit(false, false, false, false);
        emit Issuance.RevealWindowClosed();
        issuance.closeRevealWindow();

        assertEq(uint256(issuance.state()), uint256(Issuance.State.CLEARING_PENDING));
        assertEq(paymentToken.balanceOf(issuer), issuerBalanceBefore + minBond);
        assertEq(issuance.commitmentOf(noShow), bytes32(0));
        assertEq(issuance.commitBondOf(noShow), 0);
    }

    function test_closeRevealWindow_revertsIfStillOpen() public {
        vm.warp(commitWindowEnd);
        issuance.closeCommitWindow();

        vm.expectRevert(Issuance.RevealWindowStillOpen.selector);
        issuance.closeRevealWindow();
    }

    function test_closeRevealWindow_revertsIfWrongState() public {
        vm.expectRevert(
            abi.encodeWithSelector(Issuance.WrongState.selector, Issuance.State.REVEAL_OPEN, Issuance.State.COMMIT_OPEN)
        );
        issuance.closeRevealWindow();
    }
}
