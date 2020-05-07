import { ClientOptions } from "@connext/types";
import { ConnextStore } from "@connext/store";

export type EventSubscriptionParams = {
  event: string;
  webhook: string;
};

export type EventSubscription = {
  id: string;
  params: EventSubscriptionParams;
};

export interface InitOptions extends ClientOptions {
  mnemonic: string;
  network?: string;
}

export interface InitClientManagerOptions {
  logger: any;
  mnemonic?: string;
  store: ConnextStore;
}
