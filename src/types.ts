import { ClientOptions } from "@connext/types";

export type EventSubscriptionParams = {
  event: string;
  webhook: string;
};

export type EventSubscription = {
  id: string;
  params: EventSubscriptionParams;
};

export interface InitOptions extends ClientOptions {
  network?: string;
}

export interface InitClientManagerOptions {
  logger: any;
  mnemonic: string;
  subscriptions: EventSubscription[];
}
