// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract SecurityToken is ERC20, Ownable {
    error ZeroAddress();
    error MinterAlreadySet();
    error NotMinter(address caller);

    event MinterSet(address indexed minter);

    address public minter;

    constructor(string memory name_, string memory symbol_, address issuer) ERC20(name_, symbol_) Ownable(issuer) {}

    function decimals() public pure override returns (uint8) {
        return 0;
    }

    function setMinter(address minter_) external onlyOwner {
        if (minter_ == address(0)) revert ZeroAddress();
        if (minter != address(0)) revert MinterAlreadySet();

        minter = minter_;
        emit MinterSet(minter_);
    }

    function mint(address to, uint256 amount) external {
        if (msg.sender != minter) revert NotMinter(msg.sender);
        _mint(to, amount);
    }
}
