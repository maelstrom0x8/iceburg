// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {DeployDemoPaymentTokenScript} from "../script/DeployDemoPaymentToken.s.sol";
import {DemoUSD} from "../script/mocks/DemoUSD.sol";

contract DeployDemoPaymentTokenTest is Test {
    uint256 constant ANVIL = 31337;
    uint256 constant ARBITRUM_SEPOLIA = 421614;
    uint256 constant ROBINHOOD_TESTNET = 46630;
    uint256 constant ANVIL_ACCOUNTS = 10;
    uint256 constant MINT_AMOUNT = 1_000_000e6;

    DeployDemoPaymentTokenScript script;

    function setUp() public {
        script = new DeployDemoPaymentTokenScript();
    }

    function test_deploysAndFundsDevAccountsOnAnvil() public {
        vm.chainId(ANVIL);
        DemoUSD token = script.run();
        assertEq(token.totalSupply(), ANVIL_ACCOUNTS * MINT_AMOUNT);
    }

    function test_deploysWithoutPremintOnArbitrumSepolia() public {
        vm.chainId(ARBITRUM_SEPOLIA);
        DemoUSD token = script.run();
        assertEq(token.totalSupply(), 0);
        assertEq(token.decimals(), 6);
    }

    function test_deploysWithoutPremintOnRobinhoodTestnet() public {
        vm.chainId(ROBINHOOD_TESTNET);
        DemoUSD token = script.run();
        assertEq(token.totalSupply(), 0);
    }

    function test_revertsOnEthereumMainnet() public {
        vm.chainId(1);
        vm.expectRevert("DeployDemoPaymentToken: Anvil or a supported testnet only");
        script.run();
    }

    function test_revertsOnArbitrumOne() public {
        vm.chainId(42161);
        vm.expectRevert("DeployDemoPaymentToken: Anvil or a supported testnet only");
        script.run();
    }

    function test_revertsOnRobinhoodMainnet() public {
        vm.chainId(4663);
        vm.expectRevert("DeployDemoPaymentToken: Anvil or a supported testnet only");
        script.run();
    }

    function testFuzz_revertsOnEveryUnsupportedChain(uint64 chainId) public {
        vm.assume(chainId != ANVIL && chainId != ARBITRUM_SEPOLIA && chainId != ROBINHOOD_TESTNET);
        vm.chainId(chainId);
        vm.expectRevert("DeployDemoPaymentToken: Anvil or a supported testnet only");
        script.run();
    }
}
