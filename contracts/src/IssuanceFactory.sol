// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.26;

import {Issuance} from "./Issuance.sol";
import {SecurityToken} from "./SecurityToken.sol";

contract IssuanceFactory {
    event IssuanceCreated(
        address indexed issuance,
        address indexed securityToken,
        address indexed issuer,
        string tokenName,
        string tokenSymbol
    );

    function createIssuance(
        Issuance.IssuanceParams memory params_,
        address issuer,
        string memory tokenName,
        string memory tokenSymbol
    ) external returns (Issuance issuance, SecurityToken securityToken) {
        securityToken = new SecurityToken(tokenName, tokenSymbol, address(this));
        params_.securityToken = address(securityToken);

        issuance = new Issuance(params_, issuer);

        securityToken.setMinter(address(issuance));
        securityToken.transferOwnership(issuer);

        emit IssuanceCreated(address(issuance), address(securityToken), issuer, tokenName, tokenSymbol);
    }
}
