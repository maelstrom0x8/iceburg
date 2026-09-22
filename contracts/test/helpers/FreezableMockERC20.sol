// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract FreezableMockERC20 is ERC20 {
    error AccountFrozen(address account);

    mapping(address => bool) public frozen;

    constructor() ERC20("Mock Regulated USD", "mRUSD") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function setFrozen(address account, bool isFrozen) external {
        frozen[account] = isFrozen;
    }

    function _update(address from, address to, uint256 value) internal override {
        if (frozen[from]) revert AccountFrozen(from);
        if (frozen[to]) revert AccountFrozen(to);
        super._update(from, to, value);
    }
}
