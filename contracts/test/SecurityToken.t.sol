// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SecurityToken} from "../src/SecurityToken.sol";

contract SecurityTokenTest is Test {
    SecurityToken token;
    address issuer = makeAddr("issuer");
    address issuance = makeAddr("issuance");
    address stranger = makeAddr("stranger");
    address bidder = makeAddr("bidder");

    function setUp() public {
        token = new SecurityToken("Series A Preferred", "SERA", issuer);
    }

    function test_metadata() public view {
        assertEq(token.name(), "Series A Preferred");
        assertEq(token.symbol(), "SERA");
        assertEq(token.decimals(), 0);
        assertEq(token.owner(), issuer);
        assertEq(token.minter(), address(0));
    }

    function test_setMinter() public {
        vm.prank(issuer);
        vm.expectEmit(true, false, false, false);
        emit SecurityToken.MinterSet(issuance);
        token.setMinter(issuance);

        assertEq(token.minter(), issuance);
    }

    function test_setMinter_revertsForNonOwner() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        token.setMinter(issuance);
    }

    function test_setMinter_revertsForZeroAddress() public {
        vm.prank(issuer);
        vm.expectRevert(SecurityToken.ZeroAddress.selector);
        token.setMinter(address(0));
    }

    function test_setMinter_revertsIfAlreadySet() public {
        vm.startPrank(issuer);
        token.setMinter(issuance);
        vm.expectRevert(SecurityToken.MinterAlreadySet.selector);
        token.setMinter(makeAddr("anotherIssuance"));
        vm.stopPrank();
    }

    function test_mint_byMinter() public {
        vm.prank(issuer);
        token.setMinter(issuance);

        vm.prank(issuance);
        token.mint(bidder, 1_000e18);

        assertEq(token.balanceOf(bidder), 1_000e18);
        assertEq(token.totalSupply(), 1_000e18);
    }

    function test_mint_revertsForNonMinter() public {
        vm.prank(issuer);
        token.setMinter(issuance);

        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(SecurityToken.NotMinter.selector, stranger));
        token.mint(bidder, 1_000e18);
    }

    function test_mint_revertsWhenNoMinterSet() public {
        vm.prank(issuer);
        vm.expectRevert(abi.encodeWithSelector(SecurityToken.NotMinter.selector, issuer));
        token.mint(bidder, 1_000e18);
    }

    function testFuzz_mint(uint256 amount) public {
        vm.prank(issuer);
        token.setMinter(issuance);

        vm.prank(issuance);
        token.mint(bidder, amount);

        assertEq(token.balanceOf(bidder), amount);
    }
}
