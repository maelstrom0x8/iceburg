// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Issuance} from "../../src/Issuance.sol";
import {SecurityToken} from "../../src/SecurityToken.sol";
import {USDG} from "../../script/config/USDG.sol";

contract IssuanceUSDGForkTest is Test {
    IERC20 usdg;
    SecurityToken securityToken;
    Issuance issuance;

    address issuer = makeAddr("usdgForkIssuer");
    address bidder1 = makeAddr("usdgForkBidder1");
    address bidder2 = makeAddr("usdgForkBidder2");
    address usdgFaucet = 0xcc9644EC26A647de0B9b86f1560d5180232f70a3;

    address attestor;
    uint256 attestorKey;

    uint64 commitWindowEnd;
    uint64 revealWindowEnd;
    uint64 challengeWindowLength = 1 hours;

    function setUp() public {
        (attestor, attestorKey) = makeAddrAndKey("usdgForkAttestor");
    }

    function _deployAgainstUSDGFork() internal {
        vm.createSelectFork(vm.envString("SEPOLIA_RPC_URL"));

        usdg = IERC20(USDG.ARBITRUM_SEPOLIA);
        commitWindowEnd = uint64(block.timestamp + 1 days);
        revealWindowEnd = uint64(block.timestamp + 2 days);

        address[] memory attestors = new address[](1);
        attestors[0] = attestor;

        securityToken = new SecurityToken("Series A Preferred", "SERA", issuer);

        Issuance.IssuanceParams memory p = Issuance.IssuanceParams({
            supply: 1_000,
            reservePrice: 1_000_000,
            capBps: 6_000,
            minHolders: 2,
            minBond: 1,
            paymentToken: address(usdg),
            securityToken: address(securityToken),
            approvedAttestors: attestors,
            commitWindowEnd: commitWindowEnd,
            revealWindowEnd: revealWindowEnd,
            challengeWindowLength: challengeWindowLength
        });
        issuance = new Issuance(p, issuer);

        vm.prank(issuer);
        securityToken.setMinter(address(issuance));

        vm.startPrank(usdgFaucet);
        usdg.transfer(bidder1, 250_000_000);
        usdg.transfer(bidder2, 150_000_000);
        usdg.transfer(issuer, 10);
        vm.stopPrank();

        vm.prank(bidder1);
        usdg.approve(address(issuance), type(uint256).max);
        vm.prank(bidder2);
        usdg.approve(address(issuance), type(uint256).max);
        vm.prank(issuer);
        usdg.approve(address(issuance), type(uint256).max);
    }

    function _reveal(address bidder, uint256 qty, uint256 price, bytes32 salt) internal {
        uint64 expiry = revealWindowEnd;
        bytes32 digest = issuance.attestationDigest(bidder, expiry);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(attestorKey, digest);

        vm.prank(bidder);
        issuance.revealBid(qty, price, salt, expiry, abi.encodePacked(r, s, v));
    }

    function test_fullLifecycle_settlesAgainstRealUSDGOnArbitrumSepolia() public {
        string memory rpcUrl = vm.envOr("SEPOLIA_RPC_URL", string(""));
        vm.skip(bytes(rpcUrl).length == 0, "set SEPOLIA_RPC_URL to an Arbitrum Sepolia RPC to run the USDG fork test");
        if (bytes(rpcUrl).length == 0) return;

        _deployAgainstUSDGFork();

        bytes32 salt1 = bytes32(uint256(1));
        bytes32 salt2 = bytes32(uint256(2));

        vm.prank(bidder1);
        issuance.commitBid(keccak256(abi.encode(uint256(100), uint256(2_000_000), salt1, bidder1)), 1);
        vm.prank(bidder2);
        issuance.commitBid(keccak256(abi.encode(uint256(100), uint256(1_000_000), salt2, bidder2)), 1);

        vm.warp(commitWindowEnd);
        issuance.closeCommitWindow();

        _reveal(bidder1, 100, 2_000_000, salt1);
        _reveal(bidder2, 100, 1_000_000, salt2);

        vm.warp(revealWindowEnd);
        issuance.closeRevealWindow();

        uint256[] memory allocations = new uint256[](2);
        allocations[0] = 100;
        allocations[1] = 100;

        vm.prank(issuer);
        issuance.proposeClearing(1_000_000, allocations, 1);

        vm.warp(block.timestamp + challengeWindowLength);
        issuance.closeChallengeWindow();
        issuance.settle();

        assertEq(securityToken.balanceOf(bidder1), 100);
        assertEq(securityToken.balanceOf(bidder2), 100);
        assertEq(issuance.claimable(bidder1), 100_000_000);
        assertEq(issuance.claimable(bidder2), 0);
        assertEq(issuance.claimable(issuer), 200_000_000 + 1);

        uint256 bidder1Before = usdg.balanceOf(bidder1);
        uint256 issuerBefore = usdg.balanceOf(issuer);

        vm.prank(bidder1);
        issuance.claim();
        vm.prank(issuer);
        issuance.claim();

        assertEq(usdg.balanceOf(bidder1), bidder1Before + 100_000_000);
        assertEq(usdg.balanceOf(issuer), issuerBefore + 200_000_000 + 1);
    }
}
