// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Issuance} from "../src/Issuance.sol";
import {SecurityToken} from "../src/SecurityToken.sol";
import {IssuanceFactory} from "../src/IssuanceFactory.sol";
import {MockERC20} from "./helpers/MockERC20.sol";
import {IssuanceParamsBuilder} from "./helpers/IssuanceParamsBuilder.sol";

contract IssuanceFactoryTest is Test {
    IssuanceFactory factory;
    MockERC20 paymentToken;
    address attestor = makeAddr("attestor");
    address issuer = makeAddr("issuer");

    function setUp() public {
        factory = new IssuanceFactory();
        paymentToken = new MockERC20();
    }

    function test_createIssuance() public {
        Issuance.IssuanceParams memory p = IssuanceParamsBuilder.defaults(address(paymentToken), address(0), attestor);

        vm.recordLogs();
        vm.prank(issuer);
        (Issuance issuance, SecurityToken securityToken) =
            factory.createIssuance(p, issuer, "Series A Preferred", "SERA");

        assertEq(issuance.issuer(), issuer);
        assertEq(securityToken.name(), "Series A Preferred");
        assertEq(securityToken.symbol(), "SERA");
        assertEq(securityToken.owner(), issuer);
        assertEq(securityToken.minter(), address(issuance));

        (,,,,,, address wiredSecurityToken,,,) = issuance.params();
        assertEq(wiredSecurityToken, address(securityToken));
    }

    function test_createIssuance_mintingWorksEndToEnd() public {
        Issuance.IssuanceParams memory p = IssuanceParamsBuilder.defaults(address(paymentToken), address(0), attestor);
        vm.prank(issuer);
        (Issuance issuance, SecurityToken securityToken) =
            factory.createIssuance(p, issuer, "Series A Preferred", "SERA");

        address bidder = makeAddr("bidder");
        vm.prank(address(issuance));
        securityToken.mint(bidder, 42);
        assertEq(securityToken.balanceOf(bidder), 42);
    }

    function test_createIssuance_issuerCannotBeBypassedForFutureMinterChanges() public {
        Issuance.IssuanceParams memory p = IssuanceParamsBuilder.defaults(address(paymentToken), address(0), attestor);
        vm.prank(issuer);
        (, SecurityToken securityToken) = factory.createIssuance(p, issuer, "Series A Preferred", "SERA");

        vm.prank(address(factory));
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, address(factory)));
        securityToken.setMinter(makeAddr("attacker"));

        vm.prank(issuer);
        vm.expectRevert(SecurityToken.MinterAlreadySet.selector);
        securityToken.setMinter(makeAddr("attacker"));
    }

    function test_createIssuance_revertsWhenCallerIsNotTheStatedIssuer() public {
        Issuance.IssuanceParams memory p = IssuanceParamsBuilder.defaults(address(paymentToken), address(0), attestor);
        address attacker = makeAddr("attacker");

        vm.prank(attacker);
        vm.expectRevert(IssuanceFactory.Unauthorized.selector);
        factory.createIssuance(p, issuer, "Victim Corp Series A", "VCSA");
    }

    function test_createIssuance_revertsWhenIssuanceParamsInvalid() public {
        Issuance.IssuanceParams memory p = IssuanceParamsBuilder.defaults(address(paymentToken), address(0), attestor);
        p.supply = 0;

        vm.prank(issuer);
        vm.expectRevert(Issuance.ZeroAmount.selector);
        factory.createIssuance(p, issuer, "Series A Preferred", "SERA");
    }
}
