import axios from "axios";
import { v4 as uuid } from "uuid";
import { IConnextClient, deBigNumberifyJson } from "@connext/types";

import { storeSubscriptions } from "./utilities";
import { EventSubscription, EventSubscriptionParams } from "./types";
import config from "./config";

export default class Subscriber {
  private _logger: any;
  private _subscriptions: EventSubscription[] = [];

  constructor(logger: any) {
    this._logger = logger;
  }

  // -- SUBSCRIBE ---------------------------------------------------------------- //

  public async subscribe(client: IConnextClient, params: EventSubscriptionParams) {
    const match = this.getSubscriptionByParams(params);
    if (match) {
      return match;
    }
    const subscription = this.formatSubscription(params);
    await this.saveSubscription(subscription);
    await this.subscribeOnClient(client, subscription);
    return subscription;
  }

  private async subscribeOnClient(client: IConnextClient, subscription: EventSubscription) {
    client.on(subscription.params.event as any, data =>
      this.onSubscription(subscription.params.event, data),
    );
  }

  // -- UNSUBSCRIBE ---------------------------------------------------------------- //

  public async unsubscribe(client: IConnextClient, id: string) {
    const subscription = this.getSubscriptionById(id);
    if (subscription) {
      await this.unsubscribeOnClient(client, subscription);
    }
    await this.removeSubscription(id);
  }

  private async unsubscribeOnClient(client: IConnextClient, subscription: EventSubscription) {
    await client.removeListener(subscription.params.event as any, data =>
      this.onSubscription(subscription.params.event, data),
    );
  }

  // -- BATCH ---------------------------------------------------------------- //

  public async batchSubscribe(
    client: IConnextClient,
    paramsArr: EventSubscriptionParams[],
  ): Promise<EventSubscription[]> {
    return Promise.all(paramsArr.map(params => this.subscribe(client, params)));
  }

  public async batchResubscribe(
    client: IConnextClient,
    subscriptions: EventSubscription[],
  ): Promise<void> {
    await Promise.all(
      subscriptions.map(subscription => this.subscribeOnClient(client, subscription)),
    );
    console.log("batchResubscribe", "subscriptions", subscriptions);
    await this.persistSubscriptions(subscriptions);
  }

  public async batchUnsubscribe(client: IConnextClient, idsArr: string[]): Promise<void> {
    await Promise.all(idsArr.map(id => this.unsubscribe(client, id)));
  }

  public async clearAllSubscriptions(client: IConnextClient): Promise<void> {
    console.log("clearAllSubscriptions", "BEFORE");
    await Promise.all(
      this._subscriptions.map(subscription => this.unsubscribeOnClient(client, subscription)),
    );
    console.log("clearAllSubscriptions", "EMPTY_ARRAY", []);
    await this.persistSubscriptions([]);
  }

  // -- STORE ---------------------------------------------------------------- //

  private async persistSubscriptions(subscriptions: EventSubscription[]) {
    console.log("persistSubscriptions", "subscriptions", subscriptions);
    this._subscriptions = subscriptions;
    await storeSubscriptions(subscriptions);
  }

  private async saveSubscription(subscription: EventSubscription) {
    console.log("saveSubscription", "subscription", subscription);
    const subscriptions = this._subscriptions;
    subscriptions.push(subscription);
    await this.persistSubscriptions(subscriptions);
  }

  private async removeSubscription(id: string) {
    console.log("removeSubscription", "id", id);
    const subscriptions = this._subscriptions.filter(x => x.id !== id);
    await this.persistSubscriptions(subscriptions);
  }

  private getSubscriptionById(id: string) {
    const matches = this._subscriptions.filter(x => x.id === id);
    if (matches && matches.length) {
      return matches[0];
    }
    return null;
  }

  private getSubscriptionsByEvent(event: string) {
    return this._subscriptions.filter(x => x.params.event === event);
  }

  private getSubscriptionByParams(params: EventSubscriptionParams): EventSubscription | undefined {
    let result;
    const matches = this.getSubscriptionsByEvent(params.event);
    if (matches && matches.length) {
      matches.forEach(event => {
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
      subscriptions.map(async subscription => {
        const { webhook } = subscription.params;
        try {
          await axios.post(webhook, {
            id: subscription.id,
            data: deBigNumberifyJson(data),
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
