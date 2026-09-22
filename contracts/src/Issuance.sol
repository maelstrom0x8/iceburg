// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ISecurityToken} from "./ISecurityToken.sol";

contract Issuance is ReentrancyGuard, EIP712 {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_BIDS = 64;
    uint256 public constant MAX_ATTESTORS = 10;
    uint256 public constant BPS_DENOMINATOR = 10_000;

    enum State {
        COMMIT_OPEN,
        REVEAL_OPEN,
        CLEARING_PENDING,
        CHALLENGE_OPEN,
        SETTLED,
        CANCELLED
    }

    struct IssuanceParams {
        uint256 supply;
        uint256 reservePrice;
        uint16 capBps;
        uint32 minHolders;
        uint256 minBond;
        address paymentToken;
        address securityToken;
        address[] approvedAttestors;
        uint64 commitWindowEnd;
        uint64 revealWindowEnd;
        uint64 challengeWindowLength;
    }

    struct Bid {
        address bidder;
        uint256 qty;
        uint256 price;
        bool eligible;
        uint256 escrow;
    }

    struct Proposal {
        uint256 clearingPrice;
        uint256[] allocations;
        address proposer;
        uint256 bond;
        uint64 challengeDeadline;
        bool isUnresolvedClaim;
    }

    error ZeroAddress();
    error ZeroAmount();
    error InvalidCapBps(uint16 capBps);
    error ZeroCap();
    error NoApprovedAttestors();
    error TooManyApprovedAttestors(uint256 count);
    error CommitWindowNotInFuture();
    error RevealWindowNotAfterCommitWindow();
    error ZeroChallengeWindowLength();
    error MinHoldersExceedsSupply(uint32 minHolders, uint256 supply);
    error WrongState(State expected, State actual);
    error CommitWindowElapsed();
    error CommitWindowStillOpen();
    error RevealWindowElapsed();
    error RevealWindowStillOpen();
    error BondTooLow(uint256 provided, uint256 required);
    error EmptyCommitment();
    error AlreadyCommitted();
    error MaxBidsReached();
    error NoCommitment();
    error CommitmentMismatch();
    error InvalidAttestation();
    error AllocationLengthMismatch(uint256 provided, uint256 expected);
    error ReserveNotMet(uint256 clearingPrice, uint256 reservePrice);
    error ThresholdViolation(uint256 bidIndex, uint256 allocation, uint256 maxAllowed);
    error CapExceeded(uint256 bidIndex, uint256 allocation, uint256 cap);
    error IneligibleBidder(uint256 bidIndex);
    error SupplyExceeded(uint256 totalAllocated, uint256 supply);
    error DiversityNotMet(uint256 distinctWinners, uint32 minHolders);
    error ProrationInconsistent(uint256 bidIndex, uint256 allocation, uint256 expectedFloor);
    error ChallengeWindowElapsed();
    error DoesNotBeatStanding();
    error DiversityAchievable(uint256 distinctAtReserve, uint32 minHolders);
    error ChallengeWindowStillOpen();
    error AlreadyFinalized();
    error NothingToClaim();

    event IssuanceCreated(
        address indexed issuer,
        uint256 supply,
        uint256 reservePrice,
        uint256 cap,
        uint32 minHolders,
        uint256 minBond,
        address paymentToken,
        address securityToken,
        uint64 commitWindowEnd,
        uint64 revealWindowEnd,
        uint64 challengeWindowLength
    );
    event BidCommitted(address indexed bidder, bytes32 commitment, uint256 bond);
    event CommitWindowClosed();
    event BidRevealed(address indexed bidder, uint256 qty, uint256 price);
    event BondForfeited(address indexed committer, uint256 amount);
    event RevealWindowClosed();
    event ClearingProposed(address indexed proposer, uint256 clearingPrice, uint256 totalAllocated, uint256 bond);
    event UnresolvedClaimProposed(address indexed proposer, uint256 bond);
    event ClearingChallenged(
        address indexed challenger,
        uint256 clearingPrice,
        uint256 totalAllocated,
        uint256 bond,
        address indexed beatenProposer,
        uint256 slashedBond
    );
    event ChallengeWindowClosed(State finalState);
    event WinnerSettled(address indexed bidder, uint256 allocation, uint256 payment, uint256 refund);
    event NonWinnerRefunded(address indexed bidder, uint256 refund);
    event Settled(address indexed finalProposer, uint256 clearingPrice, uint256 bidCount);
    event Cancelled(address indexed finalProposer);
    event Claimed(address indexed account, uint256 amount);

    address public immutable issuer;
    uint256 public immutable cap;
    State public state;
    bool public finalized;

    IssuanceParams private _params;
    Bid[] private _bids;
    Proposal private _standingProposal;
    uint256 public committedCount;
    address[] private _committers;

    mapping(address bidder => bytes32 commitment) public commitmentOf;
    mapping(address bidder => uint256 bond) public commitBondOf;

    mapping(address account => uint256 amount) public claimable;

    bytes32 private constant ATTESTATION_TYPEHASH = keccak256("Attestation(address bidder,uint64 expiry)");

    constructor(IssuanceParams memory params_, address issuer_) EIP712("Iceburg Issuance", "1") {
        if (issuer_ == address(0)) revert ZeroAddress();
        if (params_.supply == 0) revert ZeroAmount();
        if (params_.reservePrice == 0) revert ZeroAmount();
        if (params_.capBps == 0 || params_.capBps > BPS_DENOMINATOR) revert InvalidCapBps(params_.capBps);
        if (params_.minHolders == 0) revert ZeroAmount();
        if (params_.minHolders > params_.supply) revert MinHoldersExceedsSupply(params_.minHolders, params_.supply);
        if (params_.paymentToken == address(0)) revert ZeroAddress();
        if (params_.securityToken == address(0)) revert ZeroAddress();
        if (params_.approvedAttestors.length == 0) revert NoApprovedAttestors();
        if (params_.approvedAttestors.length > MAX_ATTESTORS) {
            revert TooManyApprovedAttestors(params_.approvedAttestors.length);
        }
        for (uint256 i = 0; i < params_.approvedAttestors.length; i++) {
            if (params_.approvedAttestors[i] == address(0)) revert ZeroAddress();
        }
        if (params_.commitWindowEnd <= block.timestamp) revert CommitWindowNotInFuture();
        if (params_.revealWindowEnd <= params_.commitWindowEnd) revert RevealWindowNotAfterCommitWindow();
        if (params_.challengeWindowLength == 0) revert ZeroChallengeWindowLength();

        uint256 computedCap = (uint256(params_.capBps) * params_.supply) / BPS_DENOMINATOR;
        if (computedCap == 0) revert ZeroCap();

        issuer = issuer_;
        cap = computedCap;
        _params = params_;
        state = State.COMMIT_OPEN;

        emit IssuanceCreated(
            issuer_,
            params_.supply,
            params_.reservePrice,
            computedCap,
            params_.minHolders,
            params_.minBond,
            params_.paymentToken,
            params_.securityToken,
            params_.commitWindowEnd,
            params_.revealWindowEnd,
            params_.challengeWindowLength
        );
    }

    function params()
        external
        view
        returns (
            uint256 supply,
            uint256 reservePrice,
            uint16 capBps,
            uint32 minHolders,
            uint256 minBond,
            address paymentToken,
            address securityToken,
            uint64 commitWindowEnd,
            uint64 revealWindowEnd,
            uint64 challengeWindowLength
        )
    {
        IssuanceParams storage p = _params;
        return (
            p.supply,
            p.reservePrice,
            p.capBps,
            p.minHolders,
            p.minBond,
            p.paymentToken,
            p.securityToken,
            p.commitWindowEnd,
            p.revealWindowEnd,
            p.challengeWindowLength
        );
    }

    function approvedAttestors() external view returns (address[] memory) {
        return _params.approvedAttestors;
    }

    function bidCount() external view returns (uint256) {
        return _bids.length;
    }

    function bidAt(uint256 index) external view returns (Bid memory) {
        return _bids[index];
    }

    function attestationDigest(address bidder, uint64 expiry) public view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(ATTESTATION_TYPEHASH, bidder, expiry)));
    }

    function commitBid(bytes32 commitment, uint256 bond) external nonReentrant {
        if (block.timestamp >= _params.commitWindowEnd) revert CommitWindowElapsed();
        if (commitment == bytes32(0)) revert EmptyCommitment();
        if (bond < _params.minBond) revert BondTooLow(bond, _params.minBond);
        if (commitmentOf[msg.sender] != bytes32(0)) revert AlreadyCommitted();
        if (committedCount >= MAX_BIDS) revert MaxBidsReached();

        committedCount++;
        commitmentOf[msg.sender] = commitment;
        commitBondOf[msg.sender] = bond;
        _committers.push(msg.sender);

        emit BidCommitted(msg.sender, commitment, bond);

        IERC20(_params.paymentToken).safeTransferFrom(msg.sender, address(this), bond);
    }

    function closeCommitWindow() external {
        if (state != State.COMMIT_OPEN) revert WrongState(State.COMMIT_OPEN, state);
        if (block.timestamp < _params.commitWindowEnd) revert CommitWindowStillOpen();

        state = State.REVEAL_OPEN;
        emit CommitWindowClosed();
    }

    function revealBid(
        uint256 qty,
        uint256 price,
        bytes32 salt,
        uint64 attestationExpiry,
        bytes calldata attestationSignature
    ) external nonReentrant {
        if (state != State.REVEAL_OPEN) revert WrongState(State.REVEAL_OPEN, state);
        if (block.timestamp >= _params.revealWindowEnd) revert RevealWindowElapsed();

        bytes32 commitment = commitmentOf[msg.sender];
        if (commitment == bytes32(0)) revert NoCommitment();
        if (keccak256(abi.encode(qty, price, salt, msg.sender)) != commitment) revert CommitmentMismatch();
        if (!_isValidAttestation(msg.sender, attestationExpiry, attestationSignature)) revert InvalidAttestation();

        uint256 escrow = qty * price;
        if (escrow == 0) revert ZeroAmount();

        commitmentOf[msg.sender] = bytes32(0);
        uint256 bond = commitBondOf[msg.sender];
        commitBondOf[msg.sender] = 0;

        _bids.push(Bid({bidder: msg.sender, qty: qty, price: price, eligible: true, escrow: escrow}));

        emit BidRevealed(msg.sender, qty, price);

        IERC20 token = IERC20(_params.paymentToken);
        token.safeTransferFrom(msg.sender, address(this), escrow);
        if (bond > 0) token.safeTransfer(msg.sender, bond);
    }

    function closeRevealWindow() external nonReentrant {
        if (state != State.REVEAL_OPEN) revert WrongState(State.REVEAL_OPEN, state);
        if (block.timestamp < _params.revealWindowEnd) revert RevealWindowStillOpen();

        state = State.CLEARING_PENDING;
        emit RevealWindowClosed();

        uint256 committerCount = _committers.length;
        for (uint256 i = 0; i < committerCount; i++) {
            address committer = _committers[i];
            if (commitmentOf[committer] != bytes32(0)) {
                uint256 forfeitedBond = commitBondOf[committer];
                commitmentOf[committer] = bytes32(0);
                commitBondOf[committer] = 0;
                if (forfeitedBond > 0) {
                    emit BondForfeited(committer, forfeitedBond);
                    claimable[issuer] += forfeitedBond;
                }
            }
        }
    }

    function _isValidAttestation(address bidder, uint64 expiry, bytes calldata signature)
        internal
        view
        returns (bool)
    {
        if (block.timestamp > expiry) return false;

        bytes32 digest = attestationDigest(bidder, expiry);
        (address signer, ECDSA.RecoverError err,) = ECDSA.tryRecover(digest, signature);
        if (err != ECDSA.RecoverError.NoError) return false;

        return _isApprovedAttestor(signer);
    }

    function _isApprovedAttestor(address signer) internal view returns (bool) {
        address[] storage attestors = _params.approvedAttestors;
        uint256 len = attestors.length;
        for (uint256 i = 0; i < len; i++) {
            if (attestors[i] == signer) return true;
        }
        return false;
    }

    function verifyClearing(uint256 clearingPrice, uint256[] calldata allocations)
        public
        view
        returns (uint256 totalAllocated, uint256 distinctWinners)
    {
        uint256 n = _bids.length;
        if (allocations.length != n) revert AllocationLengthMismatch(allocations.length, n);
        if (clearingPrice < _params.reservePrice) revert ReserveNotMet(clearingPrice, _params.reservePrice);

        uint256 bidCap = cap;
        uint256 rationedQty;
        uint256 rationedAllocated;

        for (uint256 i = 0; i < n; i++) {
            Bid storage b = _bids[i];
            uint256 allocation = allocations[i];

            if (allocation > bidCap) revert CapExceeded(i, allocation, bidCap);

            uint256 maxAllowed = b.qty < bidCap ? b.qty : bidCap;
            if (b.price < clearingPrice) {
                if (allocation != 0) revert ThresholdViolation(i, allocation, 0);
            } else if (allocation > maxAllowed) {
                revert ThresholdViolation(i, allocation, maxAllowed);
            } else if (allocation < maxAllowed) {
                rationedQty += b.qty;
                rationedAllocated += allocation;
            }

            if (allocation > 0 && !b.eligible) revert IneligibleBidder(i);

            totalAllocated += allocation;
            if (allocation > 0) distinctWinners++;
        }

        if (totalAllocated > _params.supply) revert SupplyExceeded(totalAllocated, _params.supply);
        if (distinctWinners < _params.minHolders) revert DiversityNotMet(distinctWinners, _params.minHolders);

        if (rationedQty > 0) {
            for (uint256 i = 0; i < n; i++) {
                Bid storage b = _bids[i];
                uint256 allocation = allocations[i];
                uint256 maxAllowed = b.qty < bidCap ? b.qty : bidCap;

                if (b.price >= clearingPrice && allocation < maxAllowed) {
                    uint256 expectedFloor = (rationedAllocated * b.qty) / rationedQty;
                    if (allocation != expectedFloor && allocation != expectedFloor + 1) {
                        revert ProrationInconsistent(i, allocation, expectedFloor);
                    }
                }
            }
        }
    }

    function standingProposal()
        external
        view
        returns (
            uint256 clearingPrice,
            uint256[] memory allocations,
            address proposer,
            uint256 bond,
            uint64 challengeDeadline,
            bool isUnresolvedClaim
        )
    {
        Proposal storage p = _standingProposal;
        return (p.clearingPrice, p.allocations, p.proposer, p.bond, p.challengeDeadline, p.isUnresolvedClaim);
    }

    function _sumAllocations(uint256[] storage allocations) internal view returns (uint256 total) {
        uint256 len = allocations.length;
        for (uint256 i = 0; i < len; i++) {
            total += allocations[i];
        }
    }

    function _countAtOrAboveReserve() internal view returns (uint256 count) {
        uint256 n = _bids.length;
        uint256 reserve = _params.reservePrice;
        for (uint256 i = 0; i < n; i++) {
            if (_bids[i].price >= reserve) count++;
        }
    }

    function _setStandingProposal(
        uint256 clearingPrice,
        uint256[] memory allocations,
        address proposer,
        uint256 bond,
        uint64 deadline,
        bool isUnresolvedClaim
    ) internal {
        delete _standingProposal.allocations;
        for (uint256 i = 0; i < allocations.length; i++) {
            _standingProposal.allocations.push(allocations[i]);
        }
        _standingProposal.clearingPrice = clearingPrice;
        _standingProposal.proposer = proposer;
        _standingProposal.bond = bond;
        _standingProposal.challengeDeadline = deadline;
        _standingProposal.isUnresolvedClaim = isUnresolvedClaim;
    }

    function proposeClearing(uint256 clearingPrice, uint256[] calldata allocations, uint256 bond)
        external
        nonReentrant
    {
        if (state != State.CLEARING_PENDING) revert WrongState(State.CLEARING_PENDING, state);
        if (bond < _params.minBond) revert BondTooLow(bond, _params.minBond);

        (uint256 totalAllocated,) = verifyClearing(clearingPrice, allocations);

        uint64 deadline = uint64(block.timestamp) + _params.challengeWindowLength;
        _setStandingProposal(clearingPrice, allocations, msg.sender, bond, deadline, false);
        state = State.CHALLENGE_OPEN;

        emit ClearingProposed(msg.sender, clearingPrice, totalAllocated, bond);

        IERC20(_params.paymentToken).safeTransferFrom(msg.sender, address(this), bond);
    }

    function proposeUnresolvedClearing(uint256 bond) external nonReentrant {
        if (state != State.CLEARING_PENDING) revert WrongState(State.CLEARING_PENDING, state);
        if (bond < _params.minBond) revert BondTooLow(bond, _params.minBond);

        uint256 distinctAtReserve = _countAtOrAboveReserve();
        if (distinctAtReserve >= _params.minHolders) {
            revert DiversityAchievable(distinctAtReserve, _params.minHolders);
        }

        uint64 deadline = uint64(block.timestamp) + _params.challengeWindowLength;
        _setStandingProposal(0, new uint256[](0), msg.sender, bond, deadline, true);
        state = State.CHALLENGE_OPEN;

        emit UnresolvedClaimProposed(msg.sender, bond);

        IERC20(_params.paymentToken).safeTransferFrom(msg.sender, address(this), bond);
    }

    function challengeClearing(uint256 clearingPrice, uint256[] calldata allocations, uint256 bond)
        external
        nonReentrant
    {
        if (state != State.CHALLENGE_OPEN) revert WrongState(State.CHALLENGE_OPEN, state);
        if (block.timestamp >= _standingProposal.challengeDeadline) revert ChallengeWindowElapsed();
        if (bond < _params.minBond) revert BondTooLow(bond, _params.minBond);

        (uint256 totalAllocated,) = verifyClearing(clearingPrice, allocations);

        bool beatsStanding;
        if (_standingProposal.isUnresolvedClaim) {
            beatsStanding = true;
        } else {
            uint256 newRevenue = clearingPrice * totalAllocated;
            uint256 standingVolume = _sumAllocations(_standingProposal.allocations);
            uint256 standingRevenue = _standingProposal.clearingPrice * standingVolume;
            beatsStanding =
                newRevenue > standingRevenue || (newRevenue == standingRevenue && totalAllocated > standingVolume);
        }
        if (!beatsStanding) revert DoesNotBeatStanding();

        address beatenProposer = _standingProposal.proposer;
        uint256 beatenBond = _standingProposal.bond;

        uint64 deadline = uint64(block.timestamp) + _params.challengeWindowLength;
        _setStandingProposal(clearingPrice, allocations, msg.sender, bond, deadline, false);

        emit ClearingChallenged(msg.sender, clearingPrice, totalAllocated, bond, beatenProposer, beatenBond);

        IERC20 token = IERC20(_params.paymentToken);
        token.safeTransferFrom(msg.sender, address(this), bond);
        if (beatenBond > 0) token.safeTransfer(msg.sender, beatenBond);
    }

    function closeChallengeWindow() external {
        if (state != State.CHALLENGE_OPEN) revert WrongState(State.CHALLENGE_OPEN, state);
        if (block.timestamp < _standingProposal.challengeDeadline) revert ChallengeWindowStillOpen();

        state = _standingProposal.isUnresolvedClaim ? State.CANCELLED : State.SETTLED;
        emit ChallengeWindowClosed(state);
    }

    function settle() external nonReentrant {
        if (state != State.SETTLED) revert WrongState(State.SETTLED, state);
        if (finalized) revert AlreadyFinalized();
        finalized = true;

        Proposal storage p = _standingProposal;
        uint256 clearingPrice = p.clearingPrice;
        uint256 n = _bids.length;
        ISecurityToken securityToken = ISecurityToken(_params.securityToken);

        for (uint256 i = 0; i < n; i++) {
            Bid storage b = _bids[i];
            uint256 allocation = p.allocations[i];

            if (allocation > 0) {
                uint256 payment = clearingPrice * allocation;
                uint256 refund = b.escrow - payment;
                emit WinnerSettled(b.bidder, allocation, payment, refund);
                if (refund > 0) claimable[b.bidder] += refund;
                if (payment > 0) claimable[issuer] += payment;
                securityToken.mint(b.bidder, allocation);
            } else {
                emit NonWinnerRefunded(b.bidder, b.escrow);
                if (b.escrow > 0) claimable[b.bidder] += b.escrow;
            }
        }

        emit Settled(p.proposer, clearingPrice, n);
        if (p.bond > 0) claimable[p.proposer] += p.bond;
    }

    function cancelUnresolved() external nonReentrant {
        if (state != State.CANCELLED) revert WrongState(State.CANCELLED, state);
        if (finalized) revert AlreadyFinalized();
        finalized = true;

        uint256 n = _bids.length;
        for (uint256 i = 0; i < n; i++) {
            Bid storage b = _bids[i];
            if (b.escrow > 0) claimable[b.bidder] += b.escrow;
        }

        emit Cancelled(_standingProposal.proposer);
        if (_standingProposal.bond > 0) claimable[_standingProposal.proposer] += _standingProposal.bond;
    }

    function claim() external nonReentrant {
        uint256 amount = claimable[msg.sender];
        if (amount == 0) revert NothingToClaim();
        claimable[msg.sender] = 0;
        emit Claimed(msg.sender, amount);
        IERC20(_params.paymentToken).safeTransfer(msg.sender, amount);
    }
}
