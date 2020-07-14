import axios from "axios";
import { v4 as uuid } from "uuid";
import { IConnextClient, IStoreService } from "@connext/types";

import { EventSubscription, EventSubscriptionParams, storeSubscriptions } from "./helpers";

export default class Subscriber {
  private _store: IStoreService;
  private _logger: any;
  private _subscriptions: EventSubscription[] = [];

  constructor(logger: any, store: IStoreService) {
    this._logger = logger;
    this._store = store;
  }

  // -- SUBSCRIBE ---------------------------------------------------------------- //

  public async subscribe(
    client: IConnextClient,
    params: EventSubscriptionParams,
  ): Promise<EventSubscription> {
    const match = this.getSubscriptionByParams(params);
    if (match) {
      return match;
    }
    const subscription = this.formatSubscription(params);
    await this.saveSubscription(subscription);
    this.subscribeOnClient(client, subscription);
    return subscription;
  }

  private subscribeOnClient(client: IConnextClient, subscription: EventSubscription): void {
    client.on(subscription.params.event as any, (data) =>
      this.onSubscription(subscription.params.event, data),
    );
  }

  // -- UNSUBSCRIBE ---------------------------------------------------------------- //

  public async unsubscribe(client: IConnextClient, id: string): Promise<void> {
    const subscription = this.getSubscriptionById(id);
    if (subscription) {
      this.unsubscribeOnClient(client);
    }
    await this.removeSubscription(id);
  }

  private unsubscribeOnClient(client: IConnextClient) {
    client.off();
  }

  // -- BATCH ---------------------------------------------------------------- //

  public async batchSubscribe(
    client: IConnextClient,
    paramsArr: EventSubscriptionParams[],
  ): Promise<EventSubscription[]> {
    return Promise.all(paramsArr.map((params) => this.subscribe(client, params)));
  }

  public async batchResubscribe(
    client: IConnextClient,
    subscriptions: EventSubscription[],
  ): Promise<void> {
    subscriptions.map((subscription) => this.subscribeOnClient(client, subscription));
    await this.persistSubscriptions(subscriptions);
  }

  public async batchUnsubscribe(client: IConnextClient, idsArr: string[]): Promise<void> {
    await Promise.all(idsArr.map((id) => this.unsubscribe(client, id)));
  }

  public async clearAllSubscriptions(client: IConnextClient): Promise<void> {
    this._subscriptions.map(() => this.unsubscribeOnClient(client));
    await this.persistSubscriptions([]);
  }

  // -- STORE ---------------------------------------------------------------- //

  private async persistSubscriptions(subscriptions: EventSubscription[]) {
    this._subscriptions = subscriptions;
    await storeSubscriptions(subscriptions, this._store);
  }

  private async saveSubscription(subscription: EventSubscription) {
    const subscriptions = this._subscriptions;
    subscriptions.push(subscription);
    await this.persistSubscriptions(subscriptions);
  }

  private async removeSubscription(id: string) {
    const subscriptions = this._subscriptions.filter((x) => x.id !== id);
    await this.persistSubscriptions(subscriptions);
  }

  private getSubscriptionById(id: string) {
    const matches = this._subscriptions.filter((x) => x.id === id);
    if (matches && matches.length) {
      return matches[0];
    }
    return null;
  }

  private getSubscriptionsByEvent(event: string) {
    return this._subscriptions.filter((x) => x.params.event === event);
  }

  private getSubscriptionByParams(params: EventSubscriptionParams): EventSubscription | undefined {
    let result;
    const matches = this.getSubscriptionsByEvent(params.event);
    if (matches && matches.length) {
      matches.forEach((event) => {
        if (event.params.webhook === params.webhook) {
          result = event;
        }
      });
    }
    return result;
  }

  // -- MISC ---------------------------------------------------------------- //

  private async onSubscription(event: string, data: any) {
    const subscriptions = this.getSubscriptionsByEvent(event);
    await Promise.all(
      subscriptions.map(async (subscription) => {
        const { webhook } = subscription.params;
        try {
          await axios.post(webhook, {
            id: subscription.id,
            data,
          });
          this._logger.info(`Successfully pushed event ${event} to webhook: ${webhook}`);
        } catch (error) {
          this._logger.error(error);
        }
      }),
    );
  }

  private formatSubscription(params: EventSubscriptionParams): EventSubscription {
    return { id: uuid(), params };
  }
}
