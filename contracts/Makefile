-include .env

UI_DIR := ../iceburg-ui/src/contracts

.PHONY: anvil build test deploy deploy-local sync-abi bootstrap-local bootstrap-arbitrum-sepolia bootstrap-robinhood-testnet

anvil:
	anvil

build:
	forge build

test:
	forge test -vvv

# Usage: make deploy SCRIPT=Issuance.s.sol:IssuanceScript RPC_URL=https://...
deploy:
	@test -n "$(SCRIPT)" || (echo "usage: make deploy SCRIPT=<file.s.sol>:<ContractName> RPC_URL=<url>" && exit 1)
	@test -n "$(RPC_URL)" || (echo "usage: make deploy SCRIPT=<file.s.sol>:<ContractName> RPC_URL=<url> (or use deploy-local for anvil)" && exit 1)
	forge script script/$(SCRIPT) \
		--rpc-url $(RPC_URL) \
		--private-key $(PRIVATE_KEY) \
		--broadcast
	@$(MAKE) sync-abi

# Deploys a script to a local anvil node (must be running in another terminal)
# using anvil's default account #0, then syncs the address + ABI to the frontend.
# Usage: make deploy-local SCRIPT=Issuance.s.sol:IssuanceScript
deploy-local:
	$(MAKE) deploy SCRIPT=$(SCRIPT) RPC_URL=http://127.0.0.1:8545

# Copies the compiled ABI + the latest deployed address for each contract
# into iceburg-ui/src/contracts so the frontend always has fresh types/addresses.
sync-abi:
	mkdir -p $(UI_DIR)
	node ../scripts/sync-abi.mjs

# Deploys the singleton protocol contracts (payment token, attestor
# registry, factory) against a running local anvil, in one command.
bootstrap-local:
	$(MAKE) deploy-local SCRIPT=DeployDemoPaymentToken.s.sol:DeployDemoPaymentTokenScript
	$(MAKE) deploy-local SCRIPT=DeployAttestorRegistry.s.sol:DeployAttestorRegistryScript
	$(MAKE) deploy-local SCRIPT=DeployIssuanceFactory.s.sol:DeployIssuanceFactoryScript

# No payment-token deploy on these — real USDG is already live there
# (contracts/script/config/USDG.sol). Requires SEPOLIA_RPC_URL /
# ROBINHOOD_TESTNET_RPC_URL and a funded PRIVATE_KEY in .env.
bootstrap-arbitrum-sepolia:
	$(MAKE) deploy SCRIPT=DeployAttestorRegistry.s.sol:DeployAttestorRegistryScript RPC_URL=$(SEPOLIA_RPC_URL)
	$(MAKE) deploy SCRIPT=DeployIssuanceFactory.s.sol:DeployIssuanceFactoryScript RPC_URL=$(SEPOLIA_RPC_URL)

bootstrap-robinhood-testnet:
	$(MAKE) deploy SCRIPT=DeployAttestorRegistry.s.sol:DeployAttestorRegistryScript RPC_URL=$(ROBINHOOD_TESTNET_RPC_URL)
	$(MAKE) deploy SCRIPT=DeployIssuanceFactory.s.sol:DeployIssuanceFactoryScript RPC_URL=$(ROBINHOOD_TESTNET_RPC_URL)
