// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.26;

interface ISecurityToken {
    function mint(address to, uint256 amount) external;
}
