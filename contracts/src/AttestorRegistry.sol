// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract AttestorRegistry is Ownable {
    error ZeroAddress();
    error AttestorAlreadyApproved(address attestor);
    error AttestorNotApproved(address attestor);

    event AttestorApproved(address indexed attestor);
    event AttestorRevoked(address indexed attestor);

    mapping(address attestor => bool approved) public isApprovedAttestor;
    address[] private _attestors;
    mapping(address attestor => uint256 oneBasedIndex) private _attestorIndex;

    constructor(address issuer) Ownable(issuer) {}

    function approveAttestor(address attestor) external onlyOwner {
        if (attestor == address(0)) revert ZeroAddress();
        if (isApprovedAttestor[attestor]) revert AttestorAlreadyApproved(attestor);

        isApprovedAttestor[attestor] = true;
        _attestors.push(attestor);
        _attestorIndex[attestor] = _attestors.length;

        emit AttestorApproved(attestor);
    }

    function revokeAttestor(address attestor) external onlyOwner {
        if (!isApprovedAttestor[attestor]) revert AttestorNotApproved(attestor);

        isApprovedAttestor[attestor] = false;

        uint256 index = _attestorIndex[attestor] - 1;
        uint256 lastIndex = _attestors.length - 1;
        if (index != lastIndex) {
            address lastAttestor = _attestors[lastIndex];
            _attestors[index] = lastAttestor;
            _attestorIndex[lastAttestor] = index + 1;
        }
        _attestors.pop();
        delete _attestorIndex[attestor];

        emit AttestorRevoked(attestor);
    }

    function approvedAttestors() external view returns (address[] memory) {
        return _attestors;
    }
}
