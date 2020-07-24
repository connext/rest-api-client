import {
  RawServerBase,
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyLoggerInstance,
  FastifyRequest,
  FastifyReply,
  HookHandlerDoneFunction,
} from "fastify";
import { RouteGenericInterface } from "fastify/types/route";
import { Server, IncomingMessage, ServerResponse } from "http";

declare module "fastify" {
  export interface FastifyInstance<
    RawServer extends RawServerBase = RawServerDefault,
    RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<
      RawServer
    >,
    RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
    Logger = FastifyLoggerInstance
  > {
    verifyApiKey(
      req: FastifyRequest<RouteGenericInterface, Server, IncomingMessage>,
      reply: FastifyReply<Server, IncomingMessage, ServerResponse, RouteGenericInterface, unknown>,
      done: HookHandlerDoneFunction,
    ): void;
  }
}
