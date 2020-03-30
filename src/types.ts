import { ClientOptions } from "@connext/types";

export type EventSubscriptionParams = {
  event: string;
  webhook: string;
};

export interface InitOptions extends ClientOptions {
  network?: string;
}

export interface InitClientManagerOptions {
  mnemonic?: string;
  subscriptions?: EventSubscriptionParams[];
}
