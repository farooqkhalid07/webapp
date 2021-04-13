import {
  fetchContractAddresses,
  fetchLiquidityProtectionSettingsContract
} from "../eth/contractWrappers";
import {
  logger,
  optimisticContract,
  switchMapIgnoreThrow
} from "./customOperators";
import { networkVars$, networkVersion$ } from "./network";
import { vxm } from "@/store";
import {
  distinctUntilChanged,
  pluck,
  share,
  shareReplay,
  tap
} from "rxjs/operators";
import { RegisteredContracts } from "@/types/bancor";
import { isEqual } from "lodash";
import { getContractAddressesForChainOrThrow } from "@0x/contract-addresses";

const zeroXContracts$ = networkVersion$.pipe(
  switchMapIgnoreThrow(async networkVersion =>
    getContractAddressesForChainOrThrow(networkVersion as number)
  )
);

export const exchangeProxy$ = zeroXContracts$.pipe(
  pluck("exchangeProxy"),
  shareReplay(1)
);

export const contractAddresses$ = networkVars$.pipe(
  switchMapIgnoreThrow(networkVariables => {
    return fetchContractAddresses(networkVariables.contractRegistry).catch(() =>
      vxm.ethBancor.fetchContractAddresses(networkVariables.contractRegistry)
    );
  }),
  tap(x => {
    if (vxm && vxm.ethBancor) {
      vxm.ethBancor.setContractAddresses(x);
    }
  }),
  distinctUntilChanged<RegisteredContracts>(isEqual),
  shareReplay(1)
);

export const liquidityProtection$ = contractAddresses$.pipe(
  pluck("LiquidityProtection"),
  optimisticContract("LiquidityProtection"),
  shareReplay(1)
);

export const liquidityProtectionStore$ = contractAddresses$.pipe(
  pluck("LiquidityProtectionStore"),
  optimisticContract("LiquidityProtectionStore"),
  shareReplay(1)
);

export const bancorConverterRegistry$ = contractAddresses$.pipe(
  pluck("BancorConverterRegistry"),
  optimisticContract("BancorConverterRegistry"),
  share()
);

export const stakingRewards$ = contractAddresses$.pipe(
  pluck("StakingRewards"),
  optimisticContract("StakingRewards"),
  shareReplay(1)
);

export const settingsContractAddress$ = liquidityProtection$.pipe(
  switchMapIgnoreThrow(protectionAddress =>
    fetchLiquidityProtectionSettingsContract(protectionAddress)
  ),
  optimisticContract("LiquiditySettings"),
  logger("logger liquidity settings"),
  shareReplay<string>(1)
);