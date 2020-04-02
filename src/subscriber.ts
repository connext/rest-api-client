import axios from "axios";
import { v4 as uuid } from "uuid";
import { IConnextClient } from "@connext/types";

import { isMessagingSubscription, storeSubscriptions } from "./utilities";
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
    const subscription = this.formatSubscription(params);

    await this.addSubscription(subscription);
    this.routeSubscribe(client, subscription);
    return subscription;
  }

  private routeSubscribe(client: IConnextClient, subscription: EventSubscription) {
    if (isMessagingSubscription(subscription)) {
      this.subscribeOnMessaging(client, subscription);
    } else {
      this.subscribeOnClient(client, subscription);
    }
  }

  private subscribeOnClient(client: IConnextClient, subscription: EventSubscription) {
    client.on(subscription.params.event as any, data =>
      this.onSubscription(subscription.params.event, data),
    );
  }

  private subscribeOnMessaging(client: IConnextClient, subscription: EventSubscription) {
    const subject = this.formatMessagingSubject(client, subscription.params.event);
    client.messaging.subscribe(subject, (...args) => {
      console.log("subscription form the subject", args);
    });
  }

  // -- UNSUBSCRIBE ---------------------------------------------------------------- //

  public async unsubscribe(client: IConnextClient, id: string) {
    const subscription = this.getSubscriptionById(id);
    if (subscription) {
      this.routeUnsubscribe(client, subscription);
    }
    await this.removeSubscription(id);
  }

  private routeUnsubscribe(client: IConnextClient, subscription: EventSubscription) {
    if (isMessagingSubscription(subscription)) {
      this.unsubscribeOnMessaging(client, subscription);
    } else {
      this.unsubscribeOnClient(client, subscription);
    }
  }

  private unsubscribeOnClient(client: IConnextClient, subscription: EventSubscription) {
    client.removeListener(subscription.params.event as any, data =>
      this.onSubscription(subscription.params.event, data),
    );
  }

  private unsubscribeOnMessaging(client: IConnextClient, subscription: EventSubscription) {
    const subject = this.formatMessagingSubject(client, subscription.params.event);
    client.messaging.unsubscribe(subject);
  }

  // -- FORMAT ---------------------------------------------------------------- //

  private formatSubscription(params: EventSubscriptionParams): EventSubscription {
    return { id: uuid(), params };
  }

  private formatMessagingSubject(client: IConnextClient, event: string) {
    switch (event) {
      case "MESSAGE_APP_INSTANCE_INSTALL":
        return `${client.publicIdentifier}.channel.${client.multisigAddress}.app-instance.*.install`;
      default:
        throw new Error(`Unknown Messaging Event: ${event}`);
    }
  }

  // -- STORE ---------------------------------------------------------------- //

  private async persistSubscriptions(subscriptions: EventSubscription[]) {
    this._subscriptions = subscriptions;
    await storeSubscriptions(subscriptions, config.storeDir);
  }

  private async addSubscription(subscription: EventSubscription) {
    const subscriptions = this._subscriptions;
    subscriptions.push(subscription);
    await this.persistSubscriptions(subscriptions);
  }

  private async removeSubscription(id: string) {
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

  // -- MISC ---------------------------------------------------------------- //

  private async onSubscription(event: string, data: any) {
    const subscriptions = this.getSubscriptionsByEvent(event);
    await Promise.all(
      subscriptions.map(async subscription => {
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

  public async batchResubscribe(client: IConnextClient, subscriptions: EventSubscription[]) {
    this._subscriptions = [...this._subscriptions, ...subscriptions];
    subscriptions.forEach(subscription => {
      this.routeSubscribe(client, subscription);
    });
  }
}
