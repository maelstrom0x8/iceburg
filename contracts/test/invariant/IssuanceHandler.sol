// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {Issuance} from "../../src/Issuance.sol";
import {SecurityToken} from "../../src/SecurityToken.sol";
import {MockERC20} from "../helpers/MockERC20.sol";

contract IssuanceHandler is Test {
    Issuance public issuance;
    SecurityToken public securityToken;
    MockERC20 public paymentToken;
    address public issuer;
    address public attestor;
    uint256 public attestorKey;

    uint64 public commitWindowEnd;
    uint64 public revealWindowEnd;

    uint256 public constant BIDDER_COUNT = 3;
    address[BIDDER_COUNT] public bidders;
    uint256[BIDDER_COUNT] public bidQty;
    uint256[BIDDER_COUNT] public bidPrice;
    bytes32[BIDDER_COUNT] public bidSalt;
    bool[BIDDER_COUNT] public committed;
    bool[BIDDER_COUNT] public revealed;

    uint256 public revenueOfLastAcceptedProposal;
    uint256 public volumeOfLastAcceptedProposal;
    uint256 public acceptedProposalCount;
    uint256 public ghost_totalMinted;
    uint256 public ghost_totalEscrowedAtReveal;
    uint256 public ghost_totalRefundedOrPaid;

    constructor() {
        paymentToken = new MockERC20();
        issuer = makeAddr("handler-issuer");
        (attestor, attestorKey) = makeAddrAndKey("handler-attestor");

        address[] memory attestors = new address[](1);
        attestors[0] = attestor;

        commitWindowEnd = uint64(block.timestamp + 1 days);
        revealWindowEnd = uint64(block.timestamp + 2 days);

        Issuance.IssuanceParams memory p = Issuance.IssuanceParams({
            supply: 300,
            reservePrice: 1,
            capBps: 5_000,
            minHolders: 2,
            minBond: 1,
            paymentToken: address(paymentToken),
            securityToken: address(0),
            approvedAttestors: attestors,
            commitWindowEnd: commitWindowEnd,
            revealWindowEnd: revealWindowEnd,
            challengeWindowLength: 1 hours
        });

        securityToken = new SecurityToken("Handler Series", "HSER", issuer);
        p.securityToken = address(securityToken);
        issuance = new Issuance(p, issuer);

        vm.prank(issuer);
        securityToken.setMinter(address(issuance));

        for (uint256 i = 0; i < BIDDER_COUNT; i++) {
            bidders[i] = vm.addr(i + 1);
            vm.label(bidders[i], string.concat("handlerBidder", vm.toString(i)));
        }
    }

    function commit(uint256 bidderIndex, uint256 qty, uint256 price) external {
        if (issuance.state() != Issuance.State.COMMIT_OPEN) return;
        if (block.timestamp >= commitWindowEnd) return;

        bidderIndex = bound(bidderIndex, 0, BIDDER_COUNT - 1);
        if (committed[bidderIndex]) return;

        qty = bound(qty, 1, 100);
        price = bound(price, 1, 50);

        address bidder = bidders[bidderIndex];
        uint256 escrow = qty * price;
        paymentToken.mint(bidder, escrow + 1_000);
        vm.prank(bidder);
        paymentToken.approve(address(issuance), type(uint256).max);

        bytes32 salt = keccak256(abi.encode(bidderIndex, qty, price, block.timestamp));
        bytes32 commitment = keccak256(abi.encode(qty, price, salt, bidder));

        vm.prank(bidder);
        try issuance.commitBid(commitment, 1) {
            bidQty[bidderIndex] = qty;
            bidPrice[bidderIndex] = price;
            bidSalt[bidderIndex] = salt;
            committed[bidderIndex] = true;
        } catch {}
    }

    function closeCommitWindow() external {
        if (issuance.state() != Issuance.State.COMMIT_OPEN) return;
        if (block.timestamp < commitWindowEnd) vm.warp(commitWindowEnd);
        try issuance.closeCommitWindow() {} catch {}
    }

    function reveal(uint256 bidderIndex) external {
        if (issuance.state() != Issuance.State.REVEAL_OPEN) return;
        if (block.timestamp >= revealWindowEnd) return;

        bidderIndex = bound(bidderIndex, 0, BIDDER_COUNT - 1);
        if (!committed[bidderIndex] || revealed[bidderIndex]) return;

        address bidder = bidders[bidderIndex];
        uint64 expiry = revealWindowEnd;
        bytes32 digest = issuance.attestationDigest(bidder, expiry);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(attestorKey, digest);

        vm.prank(bidder);
        try issuance.revealBid(
            bidQty[bidderIndex], bidPrice[bidderIndex], bidSalt[bidderIndex], expiry, abi.encodePacked(r, s, v)
        ) {
            revealed[bidderIndex] = true;
            ghost_totalEscrowedAtReveal += bidQty[bidderIndex] * bidPrice[bidderIndex];
        } catch {}
    }

    function closeRevealWindow() external {
        if (issuance.state() != Issuance.State.REVEAL_OPEN) return;
        if (block.timestamp < revealWindowEnd) vm.warp(revealWindowEnd);
        try issuance.closeRevealWindow() {} catch {}
    }

    function _revealedIndices() internal view returns (uint256[] memory indices) {
        uint256 count;
        for (uint256 i = 0; i < BIDDER_COUNT; i++) {
            if (revealed[i]) count++;
        }
        indices = new uint256[](count);
        uint256 j;
        for (uint256 i = 0; i < BIDDER_COUNT; i++) {
            if (revealed[i]) indices[j++] = i;
        }
    }

    function _bidIndexInStorage(address bidder) internal view returns (int256) {
        uint256 n = issuance.bidCount();
        for (uint256 i = 0; i < n; i++) {
            if (issuance.bidAt(i).bidder == bidder) return int256(i);
        }
        return -1;
    }

    function _computeFeasibleClearing()
        internal
        view
        returns (bool feasible, uint256 clearingPrice, uint256[] memory allocations)
    {
        uint256 n = issuance.bidCount();
        allocations = new uint256[](n);
        if (n == 0) return (false, 0, allocations);

        uint256[] memory prices = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            prices[i] = issuance.bidAt(i).price;
        }

        for (uint256 candidate = 0; candidate < n; candidate++) {
            uint256 p = prices[candidate];
            uint256 distinct;
            for (uint256 i = 0; i < n; i++) {
                if (prices[i] >= p) distinct++;
            }
            if (distinct < 2) continue;

            uint256[] memory candidateAllocations = new uint256[](n);
            uint256 bidCap = issuance.cap();
            uint256 supply = 300;
            uint256 remaining = supply;
            for (uint256 i = 0; i < n; i++) {
                if (prices[i] >= p) {
                    Issuance.Bid memory b = issuance.bidAt(i);
                    uint256 want = b.qty < bidCap ? b.qty : bidCap;
                    uint256 give = want < remaining ? want : remaining;
                    candidateAllocations[i] = give;
                    remaining -= give;
                }
            }

            (bool ok,) = address(issuance).staticcall(
                abi.encodeWithSelector(Issuance.verifyClearing.selector, p, candidateAllocations)
            );
            if (ok) {
                return (true, p, candidateAllocations);
            }
        }
        return (false, 0, allocations);
    }

    function proposeOrChallenge(uint256 seed) external {
        Issuance.State s = issuance.state();
        if (s != Issuance.State.CLEARING_PENDING && s != Issuance.State.CHALLENGE_OPEN) return;

        (bool feasible, uint256 clearingPrice, uint256[] memory allocations) = _computeFeasibleClearing();

        address proposer = vm.addr(999 + bound(seed, 0, 3));
        paymentToken.mint(proposer, 100);
        vm.prank(proposer);
        paymentToken.approve(address(issuance), type(uint256).max);

        if (s == Issuance.State.CLEARING_PENDING) {
            if (feasible) {
                vm.prank(proposer);
                try issuance.proposeClearing(clearingPrice, allocations, 1) {
                    _recordAccepted(clearingPrice, allocations, false);
                } catch {}
            } else {
                vm.prank(proposer);
                try issuance.proposeUnresolvedClearing(1) {
                    acceptedProposalCount++;
                } catch {}
            }
        } else if (feasible) {
            vm.prank(proposer);
            try issuance.challengeClearing(clearingPrice, allocations, 100) {
                _recordAccepted(clearingPrice, allocations, true);
            } catch {}
        }
    }

    function _recordAccepted(uint256 clearingPrice, uint256[] memory allocations, bool isChallenge) internal {
        uint256 volume;
        for (uint256 i = 0; i < allocations.length; i++) {
            volume += allocations[i];
        }
        uint256 revenue = clearingPrice * volume;

        if (isChallenge && acceptedProposalCount > 0) {
            bool strictlyBetter = revenue > revenueOfLastAcceptedProposal
                || (revenue == revenueOfLastAcceptedProposal && volume > volumeOfLastAcceptedProposal);
            assertTrue(strictlyBetter, "INV-6: accepted challenge did not strictly improve on the standing proposal");
        }

        revenueOfLastAcceptedProposal = revenue;
        volumeOfLastAcceptedProposal = volume;
        acceptedProposalCount++;
    }

    function closeChallengeWindow() external {
        if (issuance.state() != Issuance.State.CHALLENGE_OPEN) return;
        (,,,, uint64 deadline,) = issuance.standingProposal();
        if (block.timestamp < deadline) vm.warp(deadline);
        try issuance.closeChallengeWindow() {} catch {}
    }

    function finalize() external {
        Issuance.State s = issuance.state();
        if (s == Issuance.State.SETTLED) {
            try issuance.settle() {
                ghost_totalMinted = securityToken.totalSupply();
            } catch {}
        } else if (s == Issuance.State.CANCELLED) {
            try issuance.cancelUnresolved() {} catch {}
        }
    }

    function bidderCount() external pure returns (uint256) {
        return BIDDER_COUNT;
    }

    function knownClaimants() public view returns (address[] memory accounts) {
        accounts = new address[](BIDDER_COUNT + 1 + 4);
        uint256 idx;
        for (uint256 i = 0; i < BIDDER_COUNT; i++) {
            accounts[idx++] = bidders[i];
        }
        accounts[idx++] = issuer;
        for (uint256 i = 0; i < 4; i++) {
            accounts[idx++] = vm.addr(999 + i);
        }
    }

    function claim(uint256 seed) external {
        address[] memory accounts = knownClaimants();
        address account = accounts[bound(seed, 0, accounts.length - 1)];
        vm.prank(account);
        try issuance.claim() {} catch {}
    }
}
