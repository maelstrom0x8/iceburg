-include .env

UI_DIR := ../iceburg-ui/src/contracts

.PHONY: anvil build test deploy-local sync-abi

anvil:
	anvil

build:
	forge build

test:
	forge test -vvv

# Deploys a script to a local anvil node (must be running in another terminal)
# using anvil's default account #0, then syncs the address + ABI to the frontend.
# Usage: make deploy-local SCRIPT=Issuance.s.sol:IssuanceScript
deploy-local:
	@test -n "$(SCRIPT)" || (echo "usage: make deploy-local SCRIPT=<file.s.sol>:<ContractName>" && exit 1)
	forge script script/$(SCRIPT) \
		--rpc-url http://127.0.0.1:8545 \
		--private-key $(PRIVATE_KEY) \
		--broadcast
	@$(MAKE) sync-abi

# Copies the compiled ABI + the latest deployed address for each contract
# into iceburg-ui/src/contracts so the frontend always has fresh types/addresses.
sync-abi:
	mkdir -p $(UI_DIR)
	node ../scripts/sync-abi.mjs
