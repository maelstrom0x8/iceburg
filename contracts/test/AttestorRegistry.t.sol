// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AttestorRegistry} from "../src/AttestorRegistry.sol";

contract AttestorRegistryTest is Test {
    AttestorRegistry registry;
    address issuer = makeAddr("issuer");
    address attestorA = makeAddr("attestorA");
    address attestorB = makeAddr("attestorB");
    address stranger = makeAddr("stranger");

    function setUp() public {
        registry = new AttestorRegistry(issuer);
    }

    function test_approveAttestor() public {
        vm.prank(issuer);
        vm.expectEmit(true, false, false, false);
        emit AttestorRegistry.AttestorApproved(attestorA);
        registry.approveAttestor(attestorA);

        assertTrue(registry.isApprovedAttestor(attestorA));
        address[] memory list = registry.approvedAttestors();
        assertEq(list.length, 1);
        assertEq(list[0], attestorA);
    }

    function test_approveAttestor_revertsForNonOwner() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        registry.approveAttestor(attestorA);
    }

    function test_approveAttestor_revertsForZeroAddress() public {
        vm.prank(issuer);
        vm.expectRevert(AttestorRegistry.ZeroAddress.selector);
        registry.approveAttestor(address(0));
    }

    function test_approveAttestor_revertsIfAlreadyApproved() public {
        vm.startPrank(issuer);
        registry.approveAttestor(attestorA);
        vm.expectRevert(abi.encodeWithSelector(AttestorRegistry.AttestorAlreadyApproved.selector, attestorA));
        registry.approveAttestor(attestorA);
        vm.stopPrank();
    }

    function test_revokeAttestor() public {
        vm.startPrank(issuer);
        registry.approveAttestor(attestorA);
        registry.approveAttestor(attestorB);

        vm.expectEmit(true, false, false, false);
        emit AttestorRegistry.AttestorRevoked(attestorA);
        registry.revokeAttestor(attestorA);
        vm.stopPrank();

        assertFalse(registry.isApprovedAttestor(attestorA));
        assertTrue(registry.isApprovedAttestor(attestorB));
        address[] memory list = registry.approvedAttestors();
        assertEq(list.length, 1);
        assertEq(list[0], attestorB);
    }

    function test_revokeAttestor_revertsForNonOwner() public {
        vm.prank(issuer);
        registry.approveAttestor(attestorA);

        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        registry.revokeAttestor(attestorA);
    }

    function test_revokeAttestor_revertsIfNotApproved() public {
        vm.prank(issuer);
        vm.expectRevert(abi.encodeWithSelector(AttestorRegistry.AttestorNotApproved.selector, attestorA));
        registry.revokeAttestor(attestorA);
    }

    function test_revokeAttestor_thenReapprove() public {
        vm.startPrank(issuer);
        registry.approveAttestor(attestorA);
        registry.revokeAttestor(attestorA);
        registry.approveAttestor(attestorA);
        vm.stopPrank();

        assertTrue(registry.isApprovedAttestor(attestorA));
        address[] memory list = registry.approvedAttestors();
        assertEq(list.length, 1);
        assertEq(list[0], attestorA);
    }

    function testFuzz_enumerationStaysConsistentAcrossSwapRemove(uint8 approveCount, uint8 revokeSeed) public {
        approveCount = uint8(bound(approveCount, 1, 20));
        address[] memory attestors = new address[](approveCount);

        vm.startPrank(issuer);
        for (uint256 i = 0; i < approveCount; i++) {
            attestors[i] = address(uint160(uint256(keccak256(abi.encode("attestor", i)))));
            registry.approveAttestor(attestors[i]);
        }

        uint256 toRevoke = revokeSeed % approveCount;
        registry.revokeAttestor(attestors[toRevoke]);
        vm.stopPrank();

        assertFalse(registry.isApprovedAttestor(attestors[toRevoke]));
        address[] memory list = registry.approvedAttestors();
        assertEq(list.length, approveCount - 1);
        for (uint256 i = 0; i < list.length; i++) {
            assertTrue(registry.isApprovedAttestor(list[i]));
            assertNotEq(list[i], attestors[toRevoke]);
        }
    }
}
