// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {Issuance} from "../src/Issuance.sol";
import {MockERC20} from "./helpers/MockERC20.sol";

contract IssuanceVerifierTest is Test {
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
            securityToken: securityToken,
            approvedAttestors: attestors,
            commitWindowEnd: commitWindowEnd,
            revealWindowEnd: revealWindowEnd,
            challengeWindowLength: 1 hours
        });
        issuance = new Issuance(p, issuer);
    }

    function _commit(uint256 seed, uint256 qty, uint256 price) internal returns (address bidder) {
        bidder = vm.addr(seed);
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

    function _openReveal() internal {
        vm.warp(commitWindowEnd);
        issuance.closeCommitWindow();
    }

    function test_capPeelingFixture_accepted() public {
        _deploy(100, 1, 5_000, 2);
        _commit(1, 60, 10);
        _commit(2, 50, 8);
        _commit(3, 40, 5);
        _openReveal();
        _reveal(1, 60, 10);
        _reveal(2, 50, 8);
        _reveal(3, 40, 5);

        uint256[] memory allocations = new uint256[](3);
        allocations[0] = 50;
        allocations[1] = 50;
        allocations[2] = 0;

        (uint256 totalAllocated, uint256 distinctWinners) = issuance.verifyClearing(8, allocations);
        assertEq(totalAllocated, 100);
        assertEq(distinctWinners, 2);
    }

    function test_clampedOversubscriptionFixture_accepted() public {
        _deploy(100, 1, 10_000, 3);
        _commit(1, 80, 20);
        _commit(2, 80, 15);
        _commit(3, 10, 5);
        _commit(4, 10, 3);
        _openReveal();
        _reveal(1, 80, 20);
        _reveal(2, 80, 15);
        _reveal(3, 10, 5);
        _reveal(4, 10, 3);

        uint256[] memory allocations = new uint256[](4);
        allocations[0] = 48;
        allocations[1] = 47;
        allocations[2] = 5;
        allocations[3] = 0;

        (uint256 totalAllocated, uint256 distinctWinners) = issuance.verifyClearing(5, allocations);
        assertEq(totalAllocated, 100);
        assertEq(distinctWinners, 3);
    }

    function test_clampedOversubscriptionWithTiedPriceTier_bothRationedTogether_accepted() public {
        _deploy(100, 1, 10_000, 3);
        _commit(1, 80, 20);
        _commit(2, 80, 15);
        _commit(3, 10, 5);
        _commit(4, 10, 3);
        _commit(5, 10, 5);
        _openReveal();
        _reveal(1, 80, 20);
        _reveal(2, 80, 15);
        _reveal(3, 10, 5);
        _reveal(4, 10, 3);
        _reveal(5, 10, 5);

        uint256[] memory allocations = new uint256[](5);
        allocations[0] = 45;
        allocations[1] = 45;
        allocations[2] = 5;
        allocations[3] = 0;
        allocations[4] = 5;

        (uint256 totalAllocated, uint256 distinctWinners) = issuance.verifyClearing(5, allocations);
        assertEq(totalAllocated, 100);
        assertEq(distinctWinners, 4);
    }

    function test_diversityRoundingShortfallFixture_rejectedByV5() public {
        _deploy(11, 1, 10_000, 3);
        _commit(1, 10, 10);
        _commit(2, 1, 5);
        _commit(3, 1, 5);
        _commit(4, 1, 5);
        _openReveal();
        _reveal(1, 10, 10);
        _reveal(2, 1, 5);
        _reveal(3, 1, 5);
        _reveal(4, 1, 5);

        uint256[] memory allocations = new uint256[](4);
        allocations[0] = 10;
        allocations[1] = 1;
        allocations[2] = 0;
        allocations[3] = 0;

        vm.expectRevert(abi.encodeWithSelector(Issuance.DiversityNotMet.selector, uint256(2), uint32(3)));
        issuance.verifyClearing(5, allocations);
    }

    function _baseCaseAllocations() internal pure returns (uint256[] memory allocations) {
        allocations = new uint256[](3);
        allocations[0] = 50;
        allocations[1] = 50;
        allocations[2] = 0;
    }

    function _setUpBaseCase() internal {
        _deploy(100, 1, 5_000, 2);
        _commit(1, 60, 10);
        _commit(2, 50, 8);
        _commit(3, 40, 5);
        _openReveal();
        _reveal(1, 60, 10);
        _reveal(2, 50, 8);
        _reveal(3, 40, 5);
    }

    function test_verifyClearing_revertsForAllocationLengthMismatch() public {
        _setUpBaseCase();
        uint256[] memory allocations = new uint256[](2);
        allocations[0] = 50;
        allocations[1] = 50;

        vm.expectRevert(abi.encodeWithSelector(Issuance.AllocationLengthMismatch.selector, uint256(2), uint256(3)));
        issuance.verifyClearing(8, allocations);
    }

    function test_verifyClearing_revertsForV1_belowReserve() public {
        _deploy(100, 6, 5_000, 2);
        _commit(1, 60, 10);
        _commit(2, 50, 8);
        _commit(3, 40, 5);
        _openReveal();
        _reveal(1, 60, 10);
        _reveal(2, 50, 8);
        _reveal(3, 40, 5);

        vm.expectRevert(abi.encodeWithSelector(Issuance.ReserveNotMet.selector, uint256(5), uint256(6)));
        issuance.verifyClearing(5, _baseCaseAllocations());
    }

    function test_verifyClearing_revertsForV2_supplyExceeded() public {
        _deploy(100, 1, 6_000, 1);
        _commit(1, 70, 8);
        _commit(2, 70, 8);
        _openReveal();
        _reveal(1, 70, 8);
        _reveal(2, 70, 8);

        uint256[] memory allocations = new uint256[](2);
        allocations[0] = 60;
        allocations[1] = 60;

        vm.expectRevert(abi.encodeWithSelector(Issuance.SupplyExceeded.selector, uint256(120), uint256(100)));
        issuance.verifyClearing(8, allocations);
    }

    function test_verifyClearing_acceptsRationedFillAboveClearingPrice() public {
        _setUpBaseCase();
        uint256[] memory allocations = new uint256[](3);
        allocations[0] = 49;
        allocations[1] = 50;
        allocations[2] = 0;

        (uint256 totalAllocated,) = issuance.verifyClearing(8, allocations);
        assertEq(totalAllocated, 99);
    }

    function test_verifyClearing_revertsForProrationInconsistency() public {
        _deploy(1_000, 1, 10_000, 1);
        _commit(1, 60, 10);
        _commit(2, 40, 10);
        _openReveal();
        _reveal(1, 60, 10);
        _reveal(2, 40, 10);

        uint256[] memory allocations = new uint256[](2);
        allocations[0] = 30;
        allocations[1] = 30;

        vm.expectRevert(
            abi.encodeWithSelector(Issuance.ProrationInconsistent.selector, uint256(0), uint256(30), uint256(36))
        );
        issuance.verifyClearing(10, allocations);
    }

    function test_verifyClearing_revertsForV3_belowClearingPriceNonzero() public {
        _setUpBaseCase();
        uint256[] memory allocations = new uint256[](3);
        allocations[0] = 50;
        allocations[1] = 50;
        allocations[2] = 1;

        vm.expectRevert(
            abi.encodeWithSelector(Issuance.ThresholdViolation.selector, uint256(2), uint256(1), uint256(0))
        );
        issuance.verifyClearing(8, allocations);
    }

    function test_verifyClearing_revertsForV4_capExceeded() public {
        _deploy(100, 1, 5_000, 1);
        _commit(1, 60, 8);
        _commit(2, 60, 8);
        _openReveal();
        _reveal(1, 60, 8);
        _reveal(2, 60, 8);

        uint256[] memory allocations = new uint256[](2);
        allocations[0] = 51;
        allocations[1] = 49;

        vm.expectRevert(abi.encodeWithSelector(Issuance.CapExceeded.selector, uint256(0), uint256(51), uint256(50)));
        issuance.verifyClearing(8, allocations);
    }

    function test_verifyClearing_revertsForV4_capExceededBelowClearingPrice() public {
        _deploy(100, 1, 5_000, 1);
        _commit(1, 60, 10);
        _commit(2, 40, 5);
        _openReveal();
        _reveal(1, 60, 10);
        _reveal(2, 40, 5);

        uint256[] memory allocations = new uint256[](2);
        allocations[0] = 50;
        allocations[1] = 51;

        vm.expectRevert(abi.encodeWithSelector(Issuance.CapExceeded.selector, uint256(1), uint256(51), uint256(50)));
        issuance.verifyClearing(10, allocations);
    }

    // Regression for a liveness bug: two bidders tied on both price and qty,
    // with only enough supply for one of them, previously had no allocation
    // the verifier would accept — [1,0]/[0,1] were rejected by the old
    // all-or-nothing same-price-tier rule (one "satisfied", one "rationed"),
    // and the unresolved-claim path was also rejected because enough
    // distinct bidders existed at/above reserve. CLEARING_PENDING had no
    // valid outgoing transition. Fixed by scoping the same-price-tier rule
    // to same-price-*and*-same-qty peers, who may differ by at most the
    // floor/floor+1 remainder (here, exactly 1).
    function test_verifyClearing_tiedPriceAndQtyInsufficientSupply_accepted() public {
        _deploy(1, 1, 10_000, 1);
        _commit(1, 1, 10);
        _commit(2, 1, 10);
        _openReveal();
        _reveal(1, 1, 10);
        _reveal(2, 1, 10);

        uint256[] memory allocations = new uint256[](2);
        allocations[0] = 1;
        allocations[1] = 0;

        (uint256 totalAllocated, uint256 distinctWinners) = issuance.verifyClearing(10, allocations);
        assertEq(totalAllocated, 1);
        assertEq(distinctWinners, 1);
    }

    function test_verifyClearing_tiedPriceAndQtyInsufficientSupply_reverseAllocation_accepted() public {
        _deploy(1, 1, 10_000, 1);
        _commit(1, 1, 10);
        _commit(2, 1, 10);
        _openReveal();
        _reveal(1, 1, 10);
        _reveal(2, 1, 10);

        uint256[] memory allocations = new uint256[](2);
        allocations[0] = 0;
        allocations[1] = 1;

        (uint256 totalAllocated,) = issuance.verifyClearing(10, allocations);
        assertEq(totalAllocated, 1);
    }

    // Regression for the report's second reproduction case: cap-peeling
    // combined with a shared clearing price. A hits the per-bidder cap
    // (satisfied), B does not (rationed) — legitimate because they have
    // different qty (and therefore different maxAllowed), not an instance of
    // the same-price-tier exploit the fairness rule exists to block.
    function test_verifyClearing_capPeelingWithSharedClearingPrice_accepted() public {
        _deploy(80, 1, 6_250, 1); // cap = 6250bps * 80 / 10000 = 50
        _commit(1, 100, 10);
        _commit(2, 40, 10);
        _openReveal();
        _reveal(1, 100, 10);
        _reveal(2, 40, 10);

        uint256[] memory allocations = new uint256[](2);
        allocations[0] = 50;
        allocations[1] = 30;

        (uint256 totalAllocated,) = issuance.verifyClearing(10, allocations);
        assertEq(totalAllocated, 80);
    }

    // A same-price pair with *different* qty, where one legitimately hits
    // the shared per-bidder cap while the other is still being rationed
    // below its own (smaller) cap. Never tested by the original P3-11 fix
    // (per iceburg.doc/audit.md's own admission) and rejected by the old
    // all-or-nothing rule despite being legitimate.
    function test_verifyClearing_samePriceDifferentQtyOneCappedOneRationed_accepted() public {
        _deploy(80, 1, 6_250, 1); // cap = 50
        _commit(1, 1000, 10);
        _commit(2, 60, 10);
        _openReveal();
        _reveal(1, 1000, 10);
        _reveal(2, 60, 10);

        uint256[] memory allocations = new uint256[](2);
        allocations[0] = 50; // capped, satisfied
        allocations[1] = 30; // rationed

        (uint256 totalAllocated,) = issuance.verifyClearing(10, allocations);
        assertEq(totalAllocated, 80);
    }

    function test_verifyClearing_revertsForV5_diversityNotMet() public {
        _deploy(100, 1, 10_000, 3);
        _commit(1, 100, 10);
        _commit(2, 40, 5);
        _commit(3, 40, 5);
        _openReveal();
        _reveal(1, 100, 10);
        _reveal(2, 40, 5);
        _reveal(3, 40, 5);

        uint256[] memory allocations = new uint256[](3);
        allocations[0] = 100;
        allocations[1] = 0;
        allocations[2] = 0;

        vm.expectRevert(abi.encodeWithSelector(Issuance.DiversityNotMet.selector, uint256(1), uint32(3)));
        issuance.verifyClearing(10, allocations);
    }
}
